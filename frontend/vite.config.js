import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: true,   // Bind to 0.0.0.0 so the container is reachable from the host
    port: 3000,
    proxy: {
      // Proxy /api/* requests to the backend container during development.
      // This lets the browser access the backend through the Vite dev server
      // without CORS issues when accessing frontend directly at port 3000.
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      // FastAPI auto-generated docs (Swagger UI + ReDoc)
      '/docs': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/redoc': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/openapi.json': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      // WebSocket proxy
      '/ws': {
        target: 'ws://backend:8000',
        ws: true,
      },
    },
  },
})
