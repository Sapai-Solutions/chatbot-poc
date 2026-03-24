"""add session summary column

Revision ID: a1b2c3d4e5f6
Revises: 6e443ac4a296
Create Date: 2026-03-24 12:00:00.000000+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '6e443ac4a296'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('chat_sessions', sa.Column('summary', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('chat_sessions', 'summary')
