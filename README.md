# IGoToTheTheatre

**Я иду в театр!** is a Russian-language web app that helps a user choose one safe cultural or leisure activity based on city, state, interests, budget, time, company format, and restrictions.

The local implementation includes:

- Vue/Vite client;
- Express API;
- deterministic recommendation and safety services;
- guest profile, privacy settings, favorites, and history;
- admin moderation endpoints;
- manual event import;
- JSON persistence by default, with environment placeholders for MongoDB Atlas and AI integration.

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

## API Highlights

- `GET /api/health`
- `GET /api/catalog`
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
- `POST /api/admin/events/:id/moderate`
- `GET /api/admin/safety-rules`
- `POST /api/admin/data-sources/import`

## Safety

The app is not a psychological, medical, emergency, or social service. If user text contains crisis or immediate danger signals, the API returns `careful_mode` and does not recommend events.
