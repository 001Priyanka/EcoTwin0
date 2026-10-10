# EcoTwin0

## Local frontend and backend

The frontend and backend can be run together against the local API:

```powershell
npm install
npm run backend:dev
npm run dev
```

The Vite app uses `http://localhost:3001` as the backend default. Set
`VITE_API_BASE_URL` and `VITE_DEMO_MODE=false` in `.env` when connecting
to a deployed API. The backend permits `http://localhost:3000` and
`http://localhost:5173` by default; configure `CORS_ORIGINS` for
deployed frontend origins.

Implemented backend routes:

- `GET /health`
- `GET /zones`
- `GET /zones/:zoneId`
- `GET /summary`
- `GET /priority-zones?limit=5`
- `POST /simulate`
- `POST /ask`

The current fixture values are explicitly `simulated`. EcoScore uses the
documented deterministic heuristic in
[`docs/EcoTwin_Backend_Specification.md`](./docs/EcoTwin_Backend_Specification.md).