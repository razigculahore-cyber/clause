# Clause - Web

React + Vite chat UI for the Clause support assistant. It calls `POST /ask` on the
FastAPI backend in [`../api`](../api).

## Run

Start the API first (from `api/`):

```powershell
uv run fastapi dev app/main.py   # serves on http://127.0.0.1:8000
```

Then, from `web/`:

```powershell
npm install
npm run dev                      # http://localhost:5173
```

The dev server proxies `/api/*` to the API, so no CORS setup is needed. Set
`API_PROXY_TARGET` in `.env.local` if the API runs elsewhere (see `.env.example`).
