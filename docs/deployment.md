# Deployment Guide

This guide describes the current JavaScript deployment path for **IGoToTheTheatre**.

## Backend

1. Install dependencies:

```bash
cd backend
npm install
```

2. Configure production environment variables:

```text
NODE_ENV=production
PORT=4000
WEB_ORIGIN=https://your-frontend-domain.example
DATABASE_MODE=mongo
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=igotothetheatre
JWT_SECRET=<strong-private-secret>
ADMIN_USERNAME=<admin-login>
ADMIN_PASSWORD_HASH=<bcrypt-hash>
ADMIN_TOKEN_TTL=8h
REQUEST_BODY_LIMIT=1mb
PUBLIC_TEXT_MAX_LENGTH=4000
PUBLIC_TEXT_RATE_LIMIT_WINDOW_MS=60000
PUBLIC_TEXT_RATE_LIMIT_MAX=30
```

`ADMIN_PASSWORD` is acceptable only for local development. Prefer `ADMIN_PASSWORD_HASH` on a real server.

3. Run tests before deployment:

```bash
npm test
```

4. Start the API:

```bash
npm start
```

The server validates production secrets before connecting to storage. It rejects unsafe defaults such as `JWT_SECRET=local-dev-secret` and `ADMIN_PASSWORD=admin`.

## Frontend

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Point the client to the deployed API:

```text
VITE_API_BASE_URL=https://your-backend-domain.example/api
```

3. Build the production bundle:

```bash
npm run build
```

Deploy the generated `frontend/dist` directory to the selected static hosting platform.

## MongoDB Atlas

Use `DATABASE_MODE=mongo` and `MONGODB_URI` for Atlas. The backend seeds required catalogs, strategies, safety rules, data sources, and demo events if the database is empty.

Recommended Atlas checks:

- allow the backend host IP in Network Access;
- use a database user with a strong password;
- keep the connection string outside Git;
- confirm `MONGODB_DB_NAME=igotothetheatre`.

## CORS

Set `WEB_ORIGIN` to the final frontend origin. Local `127.0.0.1` development origins remain allowed for local testing.

## Smoke Checks

After deployment:

1. Open `GET /api/health`.
2. Open the frontend and request a recommendation.
3. Sign in as administrator.
4. Filter events in the admin panel.
5. Edit and moderate a test event.
6. Confirm MongoDB stores the updated event and moderation metadata.
