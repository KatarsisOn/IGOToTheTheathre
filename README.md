# IGoToTheTheatre

**Я иду в театр!** is a Russian-language web app that helps a user choose one safe cultural or leisure activity based on city, state, interests, budget, time, company format, and restrictions.

The local implementation includes:

- Vue/Vite client;
- Express API;
- deterministic recommendation and safety services;
- guest profile, privacy settings, favorites, and history;
- admin moderation endpoints;
- JWT-protected admin mode;
- admin event filters and editing;
- safety rule and data source editing;
- manual event import;
- public text request limits and production secret validation;
- Playwright E2E checks for user recommendations, careful mode, favorites, history, admin login, event editing, and moderation;
- JSON persistence by default, MongoDB Atlas support through `DATABASE_MODE=mongo`, and environment placeholders for AI integration.

## Local Setup

Install dependencies separately in each app if needed:

```bash
cd backend && npm install
cd ../frontend && npm install
```

Start the API:

```bash
cd backend
npm run dev
```

Start the client:

```bash
cd frontend
VITE_API_BASE_URL=http://127.0.0.1:4000/api npm run dev -- --host 127.0.0.1
```

Open the Vite URL shown in the terminal.

## Admin Access

Admin endpoints under `/api/admin/*` require a JWT token. For local development, set these variables in `backend/.env`:

```text
JWT_SECRET=local-dev-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
ADMIN_TOKEN_TTL=8h
```

The frontend hides the admin section until an administrator signs in through the "Вход администратора" button. For a real deployment, replace the local password and `JWT_SECRET` with strong private values. `ADMIN_PASSWORD_HASH` can be used instead of `ADMIN_PASSWORD` when a bcrypt hash is preferred.

## Public Request Protection

Public text endpoints are protected by a request-size limit, a text-length limit, and a simple in-memory rate limit:

```text
REQUEST_BODY_LIMIT=1mb
PUBLIC_TEXT_MAX_LENGTH=4000
PUBLIC_TEXT_RATE_LIMIT_WINDOW_MS=60000
PUBLIC_TEXT_RATE_LIMIT_MAX=30
```

In production, startup validation rejects unsafe defaults such as `JWT_SECRET=local-dev-secret`, `ADMIN_PASSWORD=admin`, missing MongoDB URI in Mongo mode, and missing `OPENAI_API_KEY` when AI mode is enabled.

## Scripts

Backend:

- `npm run dev` starts Express with nodemon.
- `npm start` starts Express with Node.
- `npm test` runs Node test suites.
- `npm run seed` imports a demo external batch into the moderation queue.

Frontend:

- `npm run dev` starts Vite.
- `npm run build` builds the app.
- `npm run preview` previews the production build.
- `npm run test:e2e` starts backend/frontend test servers and runs Playwright browser checks.
- `npm run test:e2e:headed` runs the same checks with a visible browser.

## Deployment

See [docs/deployment.md](docs/deployment.md) for the production checklist covering backend, frontend, MongoDB Atlas, CORS, environment variables, and smoke checks.

## API Highlights

- `GET /api/health`
- `GET /api/catalog`
- `POST /api/auth/admin/login`
- `GET /api/auth/admin/me`
- `POST /api/chat/message`
- `POST /api/recommendations`
- `POST /api/recommendations/:id/feedback`
- `GET /api/profile/me`
- `PUT /api/profile/me`
- `GET /api/favorites`
- `POST /api/favorites`
- `DELETE /api/favorites/:id`
- `GET /api/history`
- `DELETE /api/history`
- `GET /api/admin/events`
- `POST /api/admin/events`
- `PUT /api/admin/events/:id`
- `POST /api/admin/events/:id/moderate`
- `GET /api/admin/safety-rules`
- `POST /api/admin/safety-rules`
- `PUT /api/admin/safety-rules/:id`
- `GET /api/admin/data-sources`
- `POST /api/admin/data-sources`
- `PUT /api/admin/data-sources/:id`
- `POST /api/admin/data-sources/import`

## Safety

The app is not a psychological, medical, emergency, or social service. If user text contains potentially dangerous or immediate danger signals, the API returns `careful_mode` and does not recommend events.

## MongoDB Atlas

The backend keeps JSON storage as the default fallback for local tests. To use MongoDB Atlas:

1. Put the real connection string into `backend/.env` as `MONGODB_URI`.
2. Set:

```text
DATABASE_MODE=mongo
MONGODB_DB_NAME=igotothetheatre
```

3. Start the API:

```bash
cd backend
npm start
```

On startup the Mongo store seeds cities, strategies, leisure formats, safety rules, data sources, and demo events if the database is empty.
