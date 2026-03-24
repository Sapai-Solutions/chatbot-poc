"""Knowledge Base router.

Endpoints:
    GET  /api/knowledge-base/collections
        List Milvus collections filtered by KB_COLLECTION_NAMES.
    GET  /api/knowledge-base/collections/{collection_name}/documents
        List documents inside a specific Milvus collection.
    POST /api/knowledge-base/collections/{collection_name}/documents
        Upload a document (PDF / TXT / MD / CSV / JSON / DOCX) to a collection.
        Non-PDF files are converted to PDF before forwarding to the ingestion server.
"""

import io
import json
import logging
from pathlib import Path

import httpx
from fastapi import APIRouter, Form, HTTPException, UploadFile
from fpdf import FPDF

from app.config import get_settings

router = APIRouter(prefix="/knowledge-base", tags=["knowledge-base"])
settings = get_settings()
logger = logging.getLogger(__name__)

SUPPORTED_TEXT_EXTENSIONS = {".txt", ".md", ".csv", ".json"}
SUPPORTED_EXTENSIONS = {".pdf"} | SUPPORTED_TEXT_EXTENSIONS | {".docx"}


def _ingestion_base() -> str:
    return settings.INGESTION_SERVER_URL.rstrip("/")


def _break_long_tokens(text: str, max_len: int = 80) -> str:
    """Insert line-breaks into tokens longer than max_len so fpdf2 never overflows a cell."""
    parts = []
    for word in text.split(" "):
        while len(word) > max_len:
            parts.append(word[:max_len])
            word = word[max_len:]
        parts.append(word)
    return " ".join(parts)


def _text_to_pdf(text: str, source_filename: str) -> bytes:
    """Wrap plain text in a minimal PDF using fpdf2."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 11)
    title = source_filename.encode("latin-1", errors="replace").decode("latin-1")
    pdf.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    usable_w = pdf.w - pdf.l_margin - pdf.r_margin
    pdf.set_font("Helvetica", "", 9)
    for line in text.splitlines():
        safe = line.encode("latin-1", errors="replace").decode("latin-1")
        safe = _break_long_tokens(safe)
        pdf.multi_cell(usable_w, 5, safe)

    return bytes(pdf.output())


async def _prepare_pdf(file: UploadFile) -> tuple[bytes, str]:
    """Read an uploaded file and return (pdf_bytes, pdf_filename).

    PDFs are passed through as-is.  Text/CSV/JSON/MD are wrapped into a
    minimal PDF via fpdf2.  DOCX files are parsed with python-docx first.
    """
    original_name = file.filename or "upload"
    ext = Path(original_name).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unsupported file type '{ext}'. "
                "Supported: .pdf, .txt, .md, .csv, .json, .docx"
            ),
        )

    file_bytes = await file.read()
    pdf_name = Path(original_name).stem + ".pdf"

    if ext == ".pdf":
        return file_bytes, pdf_name

    if ext in SUPPORTED_TEXT_EXTENSIONS:
        try:
            text = file_bytes.decode("utf-8", errors="replace")
        except Exception:
            text = file_bytes.decode("latin-1", errors="replace")
        return _text_to_pdf(text, original_name), pdf_name

    # .docx
    try:
        from docx import Document as DocxDocument  # python-docx
        doc = DocxDocument(io.BytesIO(file_bytes))
        text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        return _text_to_pdf(text, original_name), pdf_name
    except ImportError:
        raise HTTPException(
            status_code=422,
            detail="DOCX support requires python-docx (add it to requirements.txt)",
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse DOCX: {exc}")


@router.get("/collections")
async def list_collections():
    """Return Milvus collections that match KB_COLLECTION_NAMES from .env."""
    collections_url = f"{_ingestion_base()}/collections"
    allowed = {
        name.strip()
        for name in settings.KB_COLLECTION_NAMES.split(",")
        if name.strip()
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(collections_url)
            response.raise_for_status()
            data = response.json()
    except httpx.RequestError as exc:
        logger.error("Failed to reach ingestion server (collections): %s", exc)
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach ingestion server: {exc}",
        )
    except httpx.HTTPStatusError as exc:
        logger.error("Ingestion server error (collections): %s", exc)
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"Ingestion server error: {exc.response.text}",
        )

    all_collections = data.get("collections", [])
    filtered = [c for c in all_collections if c.get("collection_name") in allowed]

    return {
        "total_collections": len(filtered),
        "collections": filtered,
    }


@router.get("/collections/{collection_name}/documents")
async def list_collection_documents(collection_name: str):
    """Return documents stored in a specific Milvus collection.

    Calls GET {INGESTION_SERVER_URL}/v1/documents?collection_name={collection_name}
    and returns the document list as-is.
    """
    documents_url = f"{_ingestion_base()}/v1/documents"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                documents_url, params={"collection_name": collection_name}
            )
            response.raise_for_status()
            data = response.json()
    except httpx.RequestError as exc:
        logger.error("Failed to reach ingestion server (documents): %s", exc)
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach ingestion server: {exc}",
        )
    except httpx.HTTPStatusError as exc:
        logger.error("Ingestion server error (documents): %s", exc)
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"Ingestion server error: {exc.response.text}",
        )

    return data


def _build_ingest_payload(
    collection_name: str,
    pdf_name: str,
    pdf_bytes: bytes,
    metadata: dict,
) -> tuple[dict, dict]:
    """Return (files, data) kwargs ready for httpx multipart upload."""
    request_data = {
        "collection_name": collection_name,
        "blocking": False,
        "split_options": {"chunk_size": 512, "chunk_overlap": 128},
        "custom_metadata": [{"filename": pdf_name, "metadata": metadata}],
        "generate_summary": False,
    }
    files = {"documents": (pdf_name, pdf_bytes, "application/pdf")}
    data = {"data": json.dumps(request_data)}
    return files, data


@router.post("/collections/{collection_name}/documents")
async def upload_document(
    collection_name: str,
    file: UploadFile,
    author: str = Form(default=""),
    category: str = Form(default=""),
):
    """Upload a *new* document to a Milvus collection (POST /v1/documents).

    Accepts PDF, TXT, MD, CSV, JSON, DOCX — non-PDF files are converted.
    Returns the ingestion server response which includes a task_id.
    """
    original_name = file.filename or "upload"
    pdf_bytes, pdf_name = await _prepare_pdf(file)

    metadata: dict = {"filename": original_name}
    if author:
        metadata["author"] = author
    if category:
        metadata["category"] = category

    files, data = _build_ingest_payload(collection_name, pdf_name, pdf_bytes, metadata)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{_ingestion_base()}/v1/documents",
                files=files,
                data=data,
            )
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as exc:
        logger.error("Failed to reach ingestion server (upload): %s", exc)
        raise HTTPException(status_code=502, detail=f"Could not reach ingestion server: {exc}")
    except httpx.HTTPStatusError as exc:
        logger.error("Ingestion server upload error: %s", exc)
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"Ingestion server error: {exc.response.text}",
        )


@router.patch("/collections/{collection_name}/documents")
async def replace_document(
    collection_name: str,
    file: UploadFile,
    author: str = Form(default=""),
    category: str = Form(default=""),
):
    """Replace an existing document in a Milvus collection (PATCH /v1/documents).

    Accepts the same file types as POST.  The document identified by the
    pdf_name must already exist in the collection or the ingestion server
    will return an error.
    Returns the ingestion server response which includes a task_id.
    """
    original_name = file.filename or "upload"
    pdf_bytes, pdf_name = await _prepare_pdf(file)

    metadata: dict = {"filename": original_name}
    if author:
        metadata["author"] = author
    if category:
        metadata["category"] = category

    files, data = _build_ingest_payload(collection_name, pdf_name, pdf_bytes, metadata)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.patch(
                f"{_ingestion_base()}/v1/documents",
                files=files,
                data=data,
            )
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as exc:
        logger.error("Failed to reach ingestion server (replace): %s", exc)
        raise HTTPException(status_code=502, detail=f"Could not reach ingestion server: {exc}")
    except httpx.HTTPStatusError as exc:
        logger.error("Ingestion server replace error: %s", exc)
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"Ingestion server error: {exc.response.text}",
        )


class DeleteDocumentsRequest(dict):
    """Thin alias so FastAPI generates a proper schema."""


from pydantic import BaseModel


class DeleteDocumentsBody(BaseModel):
    document_names: list[str]


@router.delete("/collections/{collection_name}/documents")
async def delete_documents(
    collection_name: str,
    body: DeleteDocumentsBody,
):
    """Delete one or more documents from a collection (DELETE /v1/documents).

    Forwards {collection_name, document_names} to the ingestion server.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                "DELETE",
                f"{_ingestion_base()}/v1/documents",
                params={"collection_name": collection_name},
                json=body.document_names,
            )
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as exc:
        logger.error("Failed to reach ingestion server (delete): %s", exc)
        raise HTTPException(status_code=502, detail=f"Could not reach ingestion server: {exc}")
    except httpx.HTTPStatusError as exc:
        logger.error("Ingestion server delete error: %s", exc)
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"Ingestion server error: {exc.response.text}",
        )


@router.get("/collections/{collection_name}/documents/status")
async def get_document_status(collection_name: str, task_id: str):
    """Poll the ingestion status of a queued upload task.

    Proxies GET {INGESTION_SERVER_URL}/v1/status?task_id={task_id}.
    Returns the raw status payload from the ingestion server.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{_ingestion_base()}/v1/status",
                params={"task_id": task_id},
            )
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as exc:
        logger.error("Failed to reach ingestion server (status): %s", exc)
        raise HTTPException(status_code=502, detail=f"Could not reach ingestion server: {exc}")
    except httpx.HTTPStatusError as exc:
        logger.error("Ingestion server status error: %s", exc)
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"Ingestion server error: {exc.response.text}",
        )
