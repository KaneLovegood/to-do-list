# to-do-list

A full-stack to-do list application built with Next.js on the frontend and NestJS on the backend.

The frontend lives in `frontend/` and handles the UI, auth flow, and client-side state.
The backend lives in `backend/` and provides the API, authentication, and database access.

## Run from source

You need two terminals.

1. Start the backend:

```bash
cd backend
npm install
npm run start:dev
```

2. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

By default, the frontend runs on `http://localhost:3000` and the backend runs on `http://localhost:3001`.

## Notes

- If you change backend or frontend environment variables, restart the relevant app.
- The frontend expects the backend API to be reachable through `BACKEND_URL`.
- For production, build each app before starting it:

```bash
cd backend && npm run build
cd frontend && npm run build
```
