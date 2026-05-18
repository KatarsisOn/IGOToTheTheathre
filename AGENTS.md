# AGENTS.md

## Project Context

The application to be developed is an intelligent chatbot named **"Я иду в театр!"**.

The product helps young people choose a safe cultural or leisure activity based on their city, current emotional state, interests, budget, available time, company format, preferences, and restrictions. The system is not a psychological, medical, emergency, or social service. It must not diagnose users or promise to solve their problems. Its role is to gently support the user by suggesting a safe leisure route: a theater performance, exhibition, workshop, dance class, vocal class, improvisation event, festival, discussion club, stand-up event, or another appropriate activity.

User-facing text should be in Russian unless the user explicitly asks otherwise.

## Current Implementation State

This repository currently uses a pragmatic JavaScript structure, not the larger TypeScript monorepo described later as a target architecture:

- `backend`: Express API, JSON storage fallback, MongoDB Atlas storage, recommendation service, safety service, admin routes, tests.
- `frontend`: Vue/Vite client with chat, profile, favorites, history, privacy controls, and an admin area.
- `README.md`: local setup, scripts, API list, MongoDB Atlas notes, and admin access notes.

Implemented as of the current checkpoint:

- deterministic recommendation flow;
- careful mode for potentially dangerous user text;
- event safety filtering;
- profile defaults and privacy toggles;
- favorites, feedback, and history;
- JSON storage and MongoDB Atlas mode;
- admin event moderation, safety-rule creation, data-source import;
- JWT-protected admin API under `/api/admin/*`;
- frontend admin login/logout with hidden admin navigation for regular users;
- admin event filters by city, status, source, and format;
- admin event editing, safety-rule editing, and data-source editing;
- moderation metadata: `moderatedAt` and `moderatedBy`;
- backend unit tests for recommendation, safety, admin token protection, protected admin edits, profile, favorites, history, feedback, data import, moderation metadata, privacy behavior, text-length protection, and rate limiting;
- production startup validation for unsafe secrets and missing required configuration;
- public text endpoint request protection: body-size limit, text-length guard, and in-memory rate limiting;
- Playwright E2E tests for recommendation flow, careful mode, favorites, history deletion, admin login, event editing, and admin moderation;
- frontend production build verification.

Important admin-auth details:

- admin login endpoint: `POST /api/auth/admin/login`;
- session check endpoint: `GET /api/auth/admin/me`;
- protected endpoints: every `/api/admin/*` route requires `Authorization: Bearer <token>`;
- local credentials come from `ADMIN_USERNAME`, `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`, `JWT_SECRET`, and `ADMIN_TOKEN_TTL`;
- do not commit real admin passwords, JWT secrets, MongoDB credentials, or OpenAI keys.

### Next Implementation Roadmap

The next work should continue from the current JavaScript implementation. TypeScript migration is a separate future refactor, not part of the current admin-completion stage.

1. **Test coverage expansion**
   - Add broader regression tests for edge cases in recommendation scoring, budget consent, and event safety filtering.
   - Add more E2E coverage for privacy toggles, rule editing, source editing, and mobile viewport layout.
   - Keep regression checks that full user text is not stored unless consent is enabled.

2. **Production readiness**
   - Finish deployment verification on the selected platform.
   - Add platform-specific start/build scripts after the runtime target is selected.
   - Consider Docker if the project needs reproducible local and server environments.

3. **Data quality**
   - Extend manual/demo import into a documented JSON or CSV import flow.
   - Add duplicate detection diagnostics in the admin UI.
   - Add moderation history/audit log if the project needs traceable moderation decisions beyond the current event fields.

4. **Documentation for delivery**
   - Add `docs/api/endpoints.md`.
   - Add `docs/project-status.md` with implemented modules and remaining work.
   - Add diagrams or written diagram descriptions for use cases, data model, and recommendation flow.

Completed in the latest checkpoint:

1. **Backend test coverage**
   - Added API-service tests for profile, favorites, history, feedback, admin moderation, data import, and privacy behavior.
   - Added regression checks that full user text is not stored unless consent is enabled.

2. **Production protection**
   - Added stronger startup validation for required production secrets.
   - Added basic rate limiting and request-size protection for public text endpoints.
   - Added a deployment guide for backend, frontend, MongoDB Atlas, CORS, and environment variables.

3. **Frontend E2E coverage**
   - Added Playwright tests for recommendation flow, careful mode, favorites, history deletion, admin login, event editing, and admin moderation.
   - Added stable `data-testid` attributes for key chat and admin controls.

## Target Audience

- Primary audience: young people aged **18-28**.
- Users older than 28 may still receive recommendations, but the interface can note that the service is primarily oriented toward young adults.
- For users younger than 18, the system must respect age restrictions and avoid questionable or unsafe formats.

## Product Goal

Build a web-based chatbot that recommends one best matching safe place or event for leisure. The recommendation should account for:

- city or geolocation;
- age, when required for age-restricted events;
- emotional state or user-described situation;
- interests;
- budget;
- available time;
- company format: alone, with friends, couple, group, etc.;
- preferred and unwanted leisure formats;
- age restrictions;
- safety restrictions and potentially triggering topics.

If there is no suitable event, the system may suggest:

- a similar leisure category;
- a permanent place instead of a dated event;
- an online format;
- a more expensive option only after warning the user and asking for consent to show it.

## Core User Scenario

1. User starts the dialogue without mandatory registration.
2. User selects a city from a directory or provides geolocation.
3. User describes their state in free text.
4. If the request is unclear, the bot asks clarifying questions.
5. User specifies age when needed, budget, time, interests, company format, preferences, and restrictions.
6. The system determines the state category.
7. The system chooses a strategy.
8. The system filters unsafe options.
9. The system finds a suitable event or place.
10. The system returns one best recommendation with an explanation.
11. User can request alternatives, reject the option with a reason, rate the recommendation, or save it to favorites.

## Actors And Use Cases

### Guest

- start dialogue;
- choose city or provide geolocation;
- describe state in free text;
- answer clarifying questions;
- specify budget, time, interests, company, preferences, and restrictions;
- provide age when it is needed for age-restricted recommendations;
- receive recommendation;
- request alternatives;
- provide rejection reason;
- rate recommendation.

### Registered User

Registered user inherits guest capabilities and can additionally:

- manage profile;
- configure default city, interests, budget, preferred formats, unwanted formats, and restrictions;
- save places and events to favorites;
- view history;
- delete history;
- configure notifications;
- give or revoke consent for anonymous statistics.

### Administrator

- moderate automatically loaded events;
- manually add events and places;
- edit event and place descriptions;
- manage data sources;
- correct mapping between events, strategies, and leisure formats;
- edit state categories, strategies, and leisure formats;
- remove unsafe options;
- manage blacklist;
- manage safety rules;
- view reports and statistics.

### External Data Sources

Potential sources:

- Яндекс Афиша;
- Timepad;
- VK;
- 2ГИС;
- official websites of theaters, museums, cultural centers, studios, and event venues.

External sources provide event/place data: title, description, city, address, date, time, price, source link, category, age restrictions, contacts, schedule, reviews, and rating when available.

## Functional Modules

### Web Chat Interface

- First screen should provide a calm, friendly entry into the chat.
- The bot should sound like a careful assistant, not a psychologist or motivational coach.
- Avoid pressure, diagnoses, overemotional wording, and promises to solve the user's problem.
- Main screens: start, chat, city/geolocation selection, parameter clarification, recommendation card, alternatives, profile, favorites, privacy settings, help section.

### Recommendation Card

Each recommendation card should include:

- event or place name;
- city;
- address;
- date and time when applicable;
- price;
- age restriction;
- registration or ticket link;
- "open on map" link;
- short explanation of why this option was selected;
- rating buttons;
- warning if the option exceeds the user's budget.

### Intelligent Recommendation Module

The module should:

- analyze user text;
- identify a state category;
- choose a strategic direction;
- choose suitable leisure formats;
- filter risks;
- search events and places;
- explain the recommendation;
- incorporate feedback over time.

The user must be able to correct the detected category, for example: "I am not anxious, I am just tired."

### Data Loading Module

The module should:

- load event/place data from external sources;
- check event actuality;
- check link availability;
- check date, time, price, and age restrictions;
- detect duplicates by title, date, address, and source link;
- send loaded or changed records to moderation.

### Admin Panel

The admin panel should include:

- list of loaded events;
- filters by city, source, strategy, and moderation status;
- event/place edit form;
- manual event/place creation;
- data source management;
- safety rule management;
- blacklist management;
- statistics and reports.

### Privacy And Statistics

- Anonymous statistics can be collected only with user awareness and the ability to opt out.
- Full message text should be stored only if the user explicitly consents.
- The user must be able to delete history.
- Reports may include frequent requests, cities, popular strategies, leisure formats, rejection reasons, data source quality, and safety rule triggers.

## Safety Requirements

The system must not:

- diagnose the user;
- claim to be a psychologist, doctor, or emergency service;
- encourage dangerous actions;
- recommend unsafe places or events;
- intensify negative emotional states;
- present cultural leisure as a replacement for professional help.

The system should filter events with:

- alcohol-centered themes;
- late-night or unsafe timing;
- aggressive content;
- politically tense topics;
- potentially triggering topics;
- unsafe environment;
- suspicious organizers or sources;
- unsuitable age restrictions.

If the user mentions self-harm, suicidal thoughts, violence, addiction, acute mental crisis, or immediate danger, the bot must switch to a careful support mode. In this mode, it should avoid normal event recommendation and gently suggest contacting trusted people, qualified specialists, or emergency/help services appropriate for the user's location.

## State Categories And Strategies

The research basis includes these youth problem groups:

- financial instability;
- housing difficulties;
- anxiety and mental health concerns;
- employment and career uncertainty;
- social tension;
- sense of injustice;
- generational conflict.

User-facing state categories may include:

- anxiety;
- loneliness;
- fatigue;
- career difficulties;
- financial tension;
- generational conflict;
- social tension;
- desire to change environment.

Strategic directions:

1. **Emotional relief and recovery**
   - calm events, theater, exhibitions, low-pressure creative formats.
2. **Skill development and career confidence**
   - workshops, lectures, vocal classes, improvisation, educational events.
3. **Social interaction and safe dialogue**
   - discussion clubs, documentary theater, festivals, group formats, open creative meetings.

Leisure formats may include:

- theater;
- dance;
- vocal;
- improvisation;
- master classes;
- exhibitions;
- festivals;
- stand-up;
- documentary theater;
- discussion clubs.

## Suggested Data Model

The diploma materials describe a MongoDB-oriented model. MongoDB Atlas is preferred because event data from different sources can be semi-structured.

Collections or equivalent entities:

- `Users`: account data for registered users.
- `Profiles`: name/nickname, age, city, interests, budget, favorite formats, unwanted formats, restrictions, privacy/statistics settings.
- `Cities`: city name, region, coordinates, timezone.
- `Problems`: problem groups from the research basis.
- `StateCategories`: user state categories.
- `Strategies`: strategic recommendation directions.
- `LeisureFormats`: leisure formats connected to strategies.
- `Places`: stable venues such as theaters, studios, exhibition halls, clubs, cultural centers.
- `Events`: dated activities such as performances, workshops, festivals, open mics, lectures.
- `DataSources`: external sources and processing quality.
- `Recommendations`: issued recommendations, selection parameters, explanation.
- `Feedback`: user rating and rejection reasons such as too expensive, not interesting, inconvenient time, unsuitable format, other.
- `DialogHistory`: anonymized categories, parameters, and recommendation result; full text only with consent.
- `SafetyRules`: forbidden themes, risky phrases, unsafe categories, careful-mode rules.
- `Favorites`: saved events and places.
- `Blacklist`: blocked sources, places, events, organizers, or unsafe patterns.

## Preferred Technical Direction

The current diploma text names the following stack and integrations:

- frontend: **Vue.js**;
- backend: **Node.js + Express**;
- database: **MongoDB Atlas**;
- AI/recommendation integration: model API such as OpenAI API;
- future expansion: Telegram, VK, mobile app, calendar, notifications.

If implementation starts from scratch, choose a simple maintainable architecture:

- client app for chat, profile, favorites, and admin UI;
- REST or typed API layer;
- server-side recommendation orchestration;
- database repositories/services;
- admin moderation endpoints;
- safety module isolated from recommendation logic;
- background job or command for loading events.

## Recommended Project Structure

If the application is scaffolded from scratch, keep the real software code separate from diploma/document-generation artifacts. Prefer a small monorepo with a Vue client, an Express API, and shared TypeScript types.

```text
.
├── AGENTS.md
├── README.md
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── apps
│   ├── web
│   │   ├── package.json
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── src
│   │       ├── main.ts
│   │       ├── App.vue
│   │       ├── router
│   │       │   └── index.ts
│   │       ├── api
│   │       │   ├── httpClient.ts
│   │       │   ├── chatApi.ts
│   │       │   ├── profileApi.ts
│   │       │   ├── favoritesApi.ts
│   │       │   └── adminApi.ts
│   │       ├── components
│   │       │   ├── chat
│   │       │   │   ├── ChatWindow.vue
│   │       │   │   ├── ChatMessage.vue
│   │       │   │   ├── ChatInput.vue
│   │       │   │   └── ClarifyingQuestions.vue
│   │       │   ├── recommendations
│   │       │   │   ├── RecommendationCard.vue
│   │       │   │   ├── RecommendationActions.vue
│   │       │   │   └── AlternativeList.vue
│   │       │   ├── profile
│   │       │   │   ├── ProfileForm.vue
│   │       │   │   └── PrivacySettings.vue
│   │       │   └── admin
│   │       │       ├── EventModerationTable.vue
│   │       │       ├── EventEditor.vue
│   │       │       ├── SafetyRulesEditor.vue
│   │       │       └── DataSourcesTable.vue
│   │       ├── views
│   │       │   ├── ChatView.vue
│   │       │   ├── ProfileView.vue
│   │       │   ├── FavoritesView.vue
│   │       │   ├── HistoryView.vue
│   │       │   ├── HelpView.vue
│   │       │   └── AdminView.vue
│   │       ├── stores
│   │       │   ├── chatStore.ts
│   │       │   ├── profileStore.ts
│   │       │   └── adminStore.ts
│   │       ├── styles
│   │       │   ├── main.css
│   │       │   └── tokens.css
│   │       └── types
│   │           └── ui.ts
│   └── api
│       ├── package.json
│       ├── tsconfig.json
│       └── src
│           ├── server.ts
│           ├── app.ts
│           ├── config
│           │   └── env.ts
│           ├── db
│           │   └── mongo.ts
│           ├── models
│           │   ├── User.ts
│           │   ├── Profile.ts
│           │   ├── City.ts
│           │   ├── StateCategory.ts
│           │   ├── Strategy.ts
│           │   ├── LeisureFormat.ts
│           │   ├── Place.ts
│           │   ├── Event.ts
│           │   ├── Recommendation.ts
│           │   ├── Feedback.ts
│           │   ├── DialogHistory.ts
│           │   ├── SafetyRule.ts
│           │   ├── Favorite.ts
│           │   ├── DataSource.ts
│           │   └── BlacklistItem.ts
│           ├── routes
│           │   ├── chat.routes.ts
│           │   ├── recommendations.routes.ts
│           │   ├── profile.routes.ts
│           │   ├── favorites.routes.ts
│           │   ├── history.routes.ts
│           │   └── admin.routes.ts
│           ├── controllers
│           │   ├── chat.controller.ts
│           │   ├── profile.controller.ts
│           │   ├── favorites.controller.ts
│           │   └── admin.controller.ts
│           ├── services
│           │   ├── dialogue
│           │   │   ├── dialogue.service.ts
│           │   │   └── clarifyingQuestions.service.ts
│           │   ├── recommendation
│           │   │   ├── recommendation.service.ts
│           │   │   ├── stateClassifier.service.ts
│           │   │   ├── strategySelector.service.ts
│           │   │   ├── eventSearch.service.ts
│           │   │   └── explanation.service.ts
│           │   ├── safety
│           │   │   ├── safety.service.ts
│           │   │   ├── riskDetector.service.ts
│           │   │   └── carefulMode.service.ts
│           │   ├── dataLoading
│           │   │   ├── dataLoader.service.ts
│           │   │   ├── duplicateDetector.service.ts
│           │   │   └── sourceAdapters
│           │   │       ├── timepad.adapter.ts
│           │   │       ├── vk.adapter.ts
│           │   │       └── manual.adapter.ts
│           │   ├── statistics.service.ts
│           │   └── privacy.service.ts
│           ├── repositories
│           │   ├── events.repository.ts
│           │   ├── places.repository.ts
│           │   ├── profiles.repository.ts
│           │   ├── recommendations.repository.ts
│           │   └── safetyRules.repository.ts
│           ├── middleware
│           │   ├── errorHandler.ts
│           │   ├── auth.ts
│           │   └── validateRequest.ts
│           ├── jobs
│           │   └── loadEvents.job.ts
│           ├── seeds
│           │   ├── cities.seed.ts
│           │   ├── strategies.seed.ts
│           │   ├── leisureFormats.seed.ts
│           │   └── safetyRules.seed.ts
│           └── tests
│               ├── safety.service.test.ts
│               ├── recommendation.service.test.ts
│               ├── budgetFiltering.test.ts
│               └── privacyConsent.test.ts
├── packages
│   └── shared
│       ├── package.json
│       ├── tsconfig.json
│       └── src
│           ├── types
│           │   ├── user.ts
│           │   ├── event.ts
│           │   ├── recommendation.ts
│           │   └── safety.ts
│           ├── constants
│           │   ├── stateCategories.ts
│           │   ├── strategies.ts
│           │   └── leisureFormats.ts
│           └── validators
│               ├── chatSchemas.ts
│               ├── profileSchemas.ts
│               └── adminSchemas.ts
├── docs
│   ├── diploma
│   │   └── README.md
│   ├── diagrams
│   │   ├── use-case-user.puml
│   │   ├── use-case-profile.puml
│   │   ├── use-case-admin.puml
│   │   └── use-case-data-loading.puml
│   └── api
│       └── endpoints.md
└── scripts
    ├── seed.ts
    ├── load-events.ts
    └── export-diagrams.ts
```

### Structure Notes

- `apps/web` should contain only the user interface: chat, profile, favorites, history, help, and admin screens.
- `apps/api` should contain business logic, database access, recommendation orchestration, safety checks, admin endpoints, and background jobs.
- `packages/shared` should contain reusable types, constants, and validation schemas used by both frontend and backend.
- `docs/diagrams` should store PlantUML source files for use-case diagrams and other architecture diagrams.
- `docs/diploma` should keep diploma-related notes and exported documentation. Existing generated `.docx`, `.pdf`, and Python document scripts should not be mixed with app source directories.
- `scripts` should contain developer commands for seeding data, loading events, and exporting diagrams.

### Minimum V1 Files

For the first working version, prioritize these files before building every listed screen:

- `apps/web/src/views/ChatView.vue`;
- `apps/web/src/components/chat/ChatWindow.vue`;
- `apps/web/src/components/recommendations/RecommendationCard.vue`;
- `apps/web/src/api/chatApi.ts`;
- `apps/api/src/server.ts`;
- `apps/api/src/app.ts`;
- `apps/api/src/routes/chat.routes.ts`;
- `apps/api/src/services/recommendation/recommendation.service.ts`;
- `apps/api/src/services/safety/safety.service.ts`;
- `apps/api/src/models/Event.ts`;
- `apps/api/src/models/Recommendation.ts`;
- `packages/shared/src/types/recommendation.ts`;
- `packages/shared/src/constants/stateCategories.ts`;
- `packages/shared/src/constants/strategies.ts`;
- `packages/shared/src/validators/chatSchemas.ts`.

## Detailed Development Instructions

Use this section as the main implementation guide when starting the real application in a new chat. The goal is to build a working MVP first, then expand it into a complete diploma-ready product.

### 1. Initial Repository Setup

If no application code exists yet, scaffold a TypeScript monorepo:

- root package manager: `pnpm`;
- frontend: Vue 3 + Vite + TypeScript;
- backend: Node.js + Express + TypeScript;
- database: MongoDB with Mongoose by default, because the proposed structure uses model files; the official MongoDB driver is acceptable if repositories fully own schemas and validation;
- shared package: TypeScript types, constants, and validation schemas;
- tests: Vitest for unit tests; Playwright can be added later for UI flows.

Root-level files to create first:

- `README.md`: short project description, local setup, scripts, environment variables.
- `.env.example`: all required environment variables without secrets.
- `package.json`: workspace scripts.
- `pnpm-workspace.yaml`: include `apps/*` and `packages/*`.
- `.gitignore`: ignore `node_modules`, `.env`, build outputs, logs, coverage, local database dumps.

Recommended root scripts:

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:web": "pnpm --filter ./apps/web dev",
    "dev:api": "pnpm --filter ./apps/api dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "seed": "pnpm --filter ./apps/api seed"
  }
}
```

Environment variables:

```text
NODE_ENV=development
PORT=4000
WEB_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/theater_bot
OPENAI_API_KEY=
JWT_SECRET=
STATISTICS_ENABLED=true
STORE_FULL_DIALOG_TEXT=false
```

`MONGODB_URI` may point to a local MongoDB instance during development. For diploma text and production-like deployment, MongoDB Atlas remains the preferred database option.

Do not commit real API keys or production database credentials.

### 2. Development Order

Build in this order:

1. **Project scaffold**
   - Create the monorepo structure.
   - Add basic Vue and Express apps.
   - Confirm `pnpm dev:web` and `pnpm dev:api` run successfully.

2. **Shared domain types**
   - Define event, place, recommendation, profile, feedback, safety, and chat request/response types in `packages/shared`.
   - Define constants for state categories, strategies, leisure formats, feedback reasons, and moderation statuses.
   - Add validation schemas before implementing API endpoints.

3. **Backend MVP**
   - Add Express app setup, JSON middleware, CORS, error handler, and health endpoint.
   - Add MongoDB connection.
   - Add `Event`, `Place`, `Recommendation`, `Profile`, `SafetyRule`, and `Feedback` models.
   - Add seed data for cities, strategies, formats, safety rules, and a small set of demo events.

4. **Recommendation MVP**
   - Implement a deterministic recommendation flow first, without relying on AI.
   - Match user state category to strategy.
   - Match strategy to leisure formats.
   - Filter by city, budget, date/time, user age, unwanted formats, and safety rules.
   - Return one best recommendation and a transparent explanation.

5. **Safety MVP**
   - Implement risk phrase detection and unsafe event filtering before adding advanced recommendation behavior.
   - If crisis language is detected, return careful-mode response instead of an event recommendation.
   - Keep the safety module independent from the rest of recommendation logic.

6. **Frontend MVP**
   - Build `ChatView` as the first screen, not a marketing landing page.
   - Add chat messages, input, city selection, budget/time/interests fields, and recommendation card.
   - Support loading, empty, error, careful-mode, recommendation, alternatives, and feedback states.

7. **Profile and favorites**
   - Add profile defaults: city, age, interests, budget, preferred/unwanted formats, privacy settings.
   - Add favorites for events and places.
   - Add history deletion and statistics consent.

8. **Admin MVP**
   - Add event moderation table.
   - Add event editor.
   - Add safety rules editor.
   - Add data source list.
   - Keep admin authentication simple for local MVP, but isolate admin routes from public routes.

9. **External data loading**
   - Start with `manual.adapter.ts` and seeded demo events.
   - Add real source adapters later.
   - Every loaded event must be normalized, checked for duplicates, assigned moderation status, and filtered by basic safety rules.

10. **AI integration**
   - Add AI only after deterministic recommendation and safety tests pass.
   - Use AI for text classification and explanation improvement, not as the only safety layer.
   - Always validate AI output against allowed categories, strategies, and safety rules.

### 3. Backend Implementation Rules

Keep route handlers thin:

- validate request;
- call a service;
- return response;
- forward errors to the error handler.

Business logic belongs in services:

- `dialogue.service.ts`: conversation state and clarifying questions.
- `recommendation.service.ts`: orchestration of recommendation flow.
- `stateClassifier.service.ts`: category detection from user text.
- `strategySelector.service.ts`: state category to strategy mapping.
- `eventSearch.service.ts`: event/place search and ranking.
- `explanation.service.ts`: human-readable explanation.
- `safety.service.ts`: event and text safety decisions.
- `privacy.service.ts`: consent, history, and data retention rules.

Repository files should hide database query details from services.

API responses should be predictable:

```ts
type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
```

Use stable error codes, for example:

- `VALIDATION_ERROR`;
- `NOT_FOUND`;
- `UNAUTHORIZED`;
- `FORBIDDEN`;
- `SAFETY_CAREFUL_MODE`;
- `NO_RECOMMENDATION_FOUND`;
- `INTERNAL_ERROR`.

### 4. Core API Endpoints

Implement these endpoints first:

```text
GET    /api/health
POST   /api/chat/message
POST   /api/recommendations
GET    /api/recommendations/:id
POST   /api/recommendations/:id/feedback
GET    /api/profile/me
PUT    /api/profile/me
GET    /api/favorites
POST   /api/favorites
DELETE /api/favorites/:id
GET    /api/history
DELETE /api/history
GET    /api/admin/events
POST   /api/admin/events
PUT    /api/admin/events/:id
POST   /api/admin/events/:id/moderate
GET    /api/admin/safety-rules
POST   /api/admin/safety-rules
PUT    /api/admin/safety-rules/:id
GET    /api/admin/data-sources
```

For MVP, authentication can be minimal or mocked, but the code should still keep public, user, and admin routes separate.

Endpoint intent:

- `/api/chat/message` handles conversational steps and may return clarifying questions, careful-mode responses, or a completed recommendation.
- `/api/recommendations` accepts already structured parameters and creates a recommendation directly.
- Both endpoints should call the same recommendation and safety services so business logic does not diverge.

### 5. Recommendation Flow

The recommendation service should follow this exact sequence:

1. Normalize user input.
2. Check user text for crisis or dangerous signals.
3. If crisis signals exist, return careful-mode response and stop.
4. Determine city.
5. Determine or ask for missing parameters: state, age when required, budget, time, interests, company format, restrictions.
6. Classify state category.
7. Select strategy.
8. Select allowed leisure formats.
9. Query candidate events and places.
10. Filter unsafe candidates.
11. Filter by age, time, unwanted formats, and city.
12. Filter by budget; if only over-budget candidates remain, return an explicit consent-needed state instead of silently showing an expensive option.
13. Rank remaining candidates.
14. Return the best candidate.
15. Generate a short explanation.
16. Save recommendation metadata according to privacy settings.

Ranking can start simple:

- exact city match;
- strategy match;
- preferred format match;
- within budget;
- suitable time;
- higher rating when available;
- not previously rejected by the user.

If no candidate is found:

- suggest a nearby format or permanent place;
- suggest an online option if available;
- explain that no safe matching event was found;
- do not invent unavailable events.

If only over-budget candidates are found, return a response with `status: "needs_budget_consent"` and do not mark it as a final recommendation until the user explicitly agrees to see the more expensive option. The backend may store provisional metadata for continuity, but it must not present the over-budget event as accepted by default.

### 6. Safety Implementation Rules

Safety is mandatory and should be implemented before production-like recommendation behavior.

Risk text examples to detect:

- self-harm;
- suicide;
- violence;
- immediate danger;
- addiction crisis;
- severe panic or acute mental crisis.

When detected:

- do not recommend events;
- respond in careful support mode;
- avoid diagnosis;
- encourage contacting trusted people, qualified specialists, or emergency services;
- do not hardcode crisis hotline phone numbers unless they are verified and appropriate for the user's location;
- save only minimal safety metadata unless full-text storage consent exists.

Unsafe event signals:

- alcohol-centered event;
- night-only activity;
- aggressive or humiliating content;
- unsafe venue;
- suspicious source;
- missing age restriction where one is likely required;
- political conflict or highly tense public gathering;
- triggering themes for the user's stated restrictions.

Never rely only on AI for safety. Safety rules must exist as deterministic checks in code and tests.

### 7. Frontend Implementation Rules

The first screen should be the actual chat experience. Do not build a landing page first.

Required chat states:

- initial;
- collecting city;
- collecting state;
- collecting budget/time/interests;
- loading recommendation;
- recommendation shown;
- budget consent needed;
- alternatives shown;
- feedback sent;
- no safe recommendation found;
- careful mode;
- API error.

The recommendation card should make the event inspectable:

- title;
- format;
- city;
- address;
- date/time;
- price;
- age restriction;
- link;
- map action;
- explanation;
- buttons: save, alternative, suitable, not suitable;
- for over-budget candidates: explicit consent action before normal recommendation actions.

UI tone:

- calm;
- friendly;
- practical;
- not clinical;
- not overmotivational;
- no promises like "we will solve your problem".

Russian UI copy examples:

- "Подберём спокойный вариант на сегодня или ближайшие дни."
- "Я не заменяю специалиста, но могу помочь выбрать безопасный формат досуга."
- "Похоже, сейчас лучше не подбирать мероприятие. Если рядом есть человек, которому вы доверяете, попробуйте обратиться к нему."
- "Этот вариант немного выше указанного бюджета. Показать его всё равно?"

### 7.0. UX And User Flow Specification

Use this section as the source of truth for the user experience. The interface must guide the user through a complete recommendation journey without forcing registration, overloading them with forms, or presenting unsafe recommendations.

#### UX Goal

The user should feel that the chatbot:

- understands the practical context of the request;
- asks only the questions needed for a safe recommendation;
- explains why a recommendation was selected;
- respects budget, age, time, interests, and restrictions;
- does not judge the user's emotional state;
- does not pretend to be a psychologist or emergency service;
- makes privacy choices clear;
- lets the user easily reject, adjust, save, or revisit recommendations.

The experience should feel supportive and practical, not therapeutic, clinical, motivational, or promotional.

#### Primary UX Principles

- **Immediate utility**: the first screen is the chat, with a clear way to start.
- **Progressive disclosure**: ask for missing data step by step instead of showing one large form at the beginning.
- **User control**: the user can edit parameters, reject a recommendation, ask for alternatives, clear history, and opt out of statistics.
- **Safety first**: if a request contains crisis or danger signals, careful mode interrupts the normal recommendation flow.
- **Transparency**: every recommendation includes a short explanation tied to the user's state, city, interests, budget, and restrictions.
- **No pressure**: the UI must not shame the user for rejecting options or declining data collection.
- **Privacy by default**: full message text is not stored unless the user consents.
- **Inspectable recommendations**: event cards must include enough detail to decide whether the option is actually suitable.

#### Entry Points

Supported entry points:

- first-time guest opens `/chat`;
- returning guest opens `/chat` with existing `anonymousSessionId`;
- registered user opens `/chat` with profile defaults;
- user opens a saved event from `/favorites`;
- user reviews prior recommendations in `/history`;
- administrator opens `/admin` for moderation.

For MVP, the main entry point is always `/chat`. Other views must never block the chat flow.

#### Global UX Rules

- Do not require registration before the first recommendation.
- Do not ask for age immediately unless age is required for filtering or the selected candidate has restrictions.
- Do not ask for exact geolocation if city selection is enough.
- Do not show more than one primary recommendation by default.
- Do not show unsafe or rejected events as normal options.
- Do not show over-budget events as accepted recommendations without explicit user consent.
- Do not display full user message history unless consent exists.
- Do not use technical backend wording in user-facing errors.
- Do not make admin functions visible as part of the normal user journey.

#### Main Guest Flow: First Recommendation

1. **Landing into chat**
   - User opens `/chat`.
   - UI shows a short greeting, a message input, and quick-start prompts.
   - The greeting explains the bot's purpose in one or two sentences.
   - The UI must not look like a marketing landing page.

2. **Starting the request**
   - User can type freely, for example: "Хочу куда-нибудь сходить, устал после работы".
   - User may also use quick prompts such as "Хочу спокойно отдохнуть", "Хочу что-то творческое", "Хочу пойти с друзьями".
   - The app creates or reuses `anonymousSessionId`.

3. **City collection**
   - If city is unknown, bot asks for city.
   - UI offers city autocomplete/select.
   - Geolocation can be offered as optional, not required.
   - User can continue after selecting a city.

4. **State understanding**
   - User describes state in free text or chooses a category.
   - If unclear, bot asks one clarifying question at a time.
   - User must be able to correct the detected category.
   - Example correction: "Нет, я не тревожусь, я просто устал."

5. **Preference collection**
   - Bot asks for budget, time, interests, company format, and restrictions only when needed.
   - UI may show compact chips/selects for common answers.
   - User can skip optional fields.
   - Restrictions should be treated as safety-relevant input.

6. **Age handling**
   - If the candidate pool contains age-restricted events or the user's age is needed for filtering, ask for age.
   - The question should explain why age is requested.
   - Example: "Некоторые события имеют возрастные ограничения. Укажите возраст, чтобы я не предложил неподходящий вариант."

7. **Loading recommendation**
   - UI shows assistant typing/loading state.
   - Submit controls are disabled or guarded against duplicate submissions.
   - Previous messages stay visible.

8. **Recommendation shown**
   - UI shows one recommendation card.
   - Card includes title, format, city, address, date/time, price, age restriction, source/map links, explanation, and actions.
   - Explanation should be concrete: "Подходит, потому что это спокойный формат, рядом с выбранным городом и укладывается в бюджет."

9. **Decision actions**
   - User can click "Подходит", "Не подходит", "Показать альтернативы", "Сохранить", "Открыть на карте", or "Перейти к источнику".
   - The app should not force a decision before letting the user inspect the card.

10. **After action**
   - If "Подходит": send positive feedback and offer save/open actions.
   - If "Не подходит": ask for reason and offer alternatives.
   - If "Сохранить": add to favorites and show confirmation.
   - If "Показать альтернативы": show alternative list or continue dialogue to refine parameters.

#### Returning Guest Flow

When a returning guest opens the app:

- keep the chat usable immediately;
- reuse `anonymousSessionId`;
- optionally restore non-sensitive local preferences;
- do not restore full message text from localStorage;
- show saved favorites if available;
- respect previous statistics and history settings;
- let the user start a new dialogue without clearing account-level data.

Returning guest copy may say:

```text
Можно начать новый подбор или посмотреть сохранённые варианты.
```

#### Registered User Flow

Registration is not mandatory for MVP, but the UX should allow future account support.

Registered user experience:

- profile defaults prefill city, age, interests, budget, preferred formats, and restrictions;
- user can still override defaults inside a chat;
- favorites and history are available across sessions;
- privacy settings remain visible and editable;
- recommendation explanations should mention current request parameters, not imply fixed personality profiling.

Do not make the user feel locked into old profile preferences. Chat-level choices override profile defaults for the current recommendation.

#### Parameter Editing Flow

The user must be able to adjust key parameters without restarting everything.

Editable parameters:

- city;
- state category;
- age;
- budget;
- time;
- interests;
- company format;
- restrictions;
- unwanted formats.

When a parameter changes:

- show what changed;
- rerun recommendation search;
- keep prior recommendation in history if history is enabled;
- do not lose the conversation context.

Example UI copy:

```text
Обновил параметры. Сейчас подберу вариант с учётом нового бюджета.
```

#### Clarifying Question Flow

Clarifying questions should be short and purposeful.

Ask a clarifying question when:

- city is missing;
- state is too vague;
- budget is needed to avoid unsuitable paid events;
- time is needed because events are date-based;
- age is needed for age-restricted candidates;
- restrictions mention safety-sensitive topics;
- no safe candidate can be selected from the current information.

Rules:

- ask one main question at a time;
- provide quick answer options where possible;
- allow free text answer;
- allow "Пропустить" only for non-critical fields;
- never ask sensitive questions just to make the conversation feel deeper.

#### Over-Budget Flow

If the best safe candidate exceeds the user's budget:

1. Do not show it as a final accepted recommendation.
2. Show a budget consent state.
3. Explain the mismatch clearly.
4. Offer two actions: "Показать всё равно" and "Не показывать".
5. If the user agrees, show the recommendation card with a budget warning.
6. If the user declines, search for alternatives within budget or show `no_safe_match` with a budget-specific explanation.

Example copy:

```text
Я нашёл подходящий безопасный вариант, но он выше указанного бюджета. Показать его всё равно?
```

Do not hide the price or soften the fact that the event is above budget.

#### No Safe Match Flow

If no safe matching event is found:

- do not invent events;
- explain briefly that no safe suitable option was found;
- suggest changing one or two parameters;
- offer nearby formats, permanent places, or online options if available;
- allow the user to restart or edit filters.

Example copy:

```text
По этим параметрам я не нашёл безопасного подходящего события. Можно расширить бюджет, изменить время или посмотреть похожий формат.
```

The no-match state is not an error state.

#### Alternatives Flow

Alternatives are shown when:

- user requests alternatives;
- user rejects a recommendation;
- the first recommendation is unavailable;
- the chosen option is over budget and user declines it.

Alternative UX rules:

- show a small list, not an overwhelming feed;
- each alternative should explain how it differs;
- preserve safety filtering;
- do not include already rejected items unless the user explicitly changes parameters;
- allow selecting one alternative as the active recommendation.

Recommended alternative labels:

- "Спокойнее";
- "Ближе";
- "Дешевле";
- "В другой день";
- "Более социальный формат";
- "Онлайн".

#### Feedback Flow

Feedback should be quick and low-friction.

Positive feedback:

- "Подходит" sends feedback;
- show confirmation;
- offer save/open source/open map actions.

Negative feedback:

- "Не подходит" opens rejection reasons;
- user can select one or several reasons;
- user can add optional text;
- app sends feedback;
- app offers alternatives or parameter editing.

Feedback reasons:

- too expensive;
- not interesting;
- inconvenient time;
- unsuitable format;
- too far;
- age mismatch;
- unwanted topic;
- other.

The UI must never imply that rejecting a recommendation is a failure.

#### Favorites Flow

Saving should be available for guests and registered users.

Save behavior:

- user clicks "Сохранить";
- app sends favorite request with `userId` or `anonymousSessionId`;
- card shows saved state;
- duplicate save should not create duplicate cards;
- user can remove from favorites from the card or `/favorites`.

Favorites view:

- show saved events and places;
- show unavailable/archived state;
- allow opening map/source;
- allow removing item;
- show useful empty state.

#### History And Privacy Flow

The user should understand what is stored.

First-use privacy UX:

- show a compact notice that anonymous statistics may be used to improve recommendations;
- provide a visible opt-out;
- do not block chat if the user ignores the notice;
- never enable full message text storage without explicit consent.

History behavior:

- show recommendation metadata by default;
- show full text only with consent;
- allow deleting history;
- allow disabling future history/statistics where supported;
- explain when history is empty or disabled.

Recommended privacy copy:

```text
Можно пользоваться без регистрации. По умолчанию сохраняются только технические параметры подбора, а полный текст сообщений — только с вашего согласия.
```

#### Careful Mode Flow

Careful mode interrupts the normal recommendation flow when the user text contains danger or crisis signals.

Flow:

1. User sends a message with crisis or immediate danger signals.
2. App sends request normally.
3. Backend returns careful-mode status.
4. UI displays careful-mode message.
5. UI hides recommendation cards, alternatives, "save", and "suitable" actions.
6. UI may show a neutral "Начать новый диалог" action.
7. UI must not auto-return to normal recommendation flow without a new user action.

Careful mode copy should:

- acknowledge difficulty briefly;
- say the bot is not an emergency service or specialist;
- encourage contacting trusted people, qualified help, or local emergency services;
- avoid diagnosis;
- avoid casual humor;
- avoid event suggestions.

Do not hardcode unverified hotline numbers.

#### Recommendation Explanation UX

Every recommendation must explain its reasoning in user-friendly language.

Explanation should mention:

- selected strategy or state fit;
- format fit;
- city/location fit;
- budget fit or warning;
- time fit;
- safety considerations when relevant.

Good example:

```text
Я выбрал этот мастер-класс, потому что это спокойный творческий формат, он проходит в вашем городе, укладывается в указанный бюджет и не связан с нежелательными темами.
```

Bad examples:

- "Алгоритм решил, что это оптимально."
- "Вам нужно социализироваться."
- "Это решит вашу тревожность."
- "Система уверена на 87%."

#### Notification UX

Notifications are optional and should not be part of MVP unless implemented.

If added:

- user must explicitly enable notifications;
- notification settings belong in profile;
- notify only about saved events, reminders, or relevant new alternatives;
- do not send emotionally manipulative messages;
- allow disabling notifications easily.

#### Admin UX Flow

Admin UX must support the operational lifecycle of event data.

Admin flow:

1. Admin opens moderation queue.
2. Admin filters events by city, source, status, strategy, format, or safety tag.
3. Admin opens event details.
4. Admin reviews source link, description, price, time, age, formats, strategies, and safety tags.
5. Admin approves, rejects with reason, edits, archives, or marks as duplicate.
6. Admin updates safety rules or blacklist when unsafe patterns are found.
7. Admin reviews basic statistics about requests, rejections, popular formats, and safety triggers.

Admin UX rules:

- dense layout is acceptable;
- tables should be scannable;
- status labels must be clear;
- destructive actions require confirmation;
- validation errors must not erase form edits;
- admin actions should show success/error feedback.

#### UX Acceptance Criteria

The UX/user flow is complete when:

- a first-time guest can get a recommendation without registration;
- a returning guest can continue with saved local session identity;
- profile defaults improve the flow but do not override chat-level choices;
- missing data is requested progressively;
- the user can edit parameters without restarting;
- over-budget candidates require explicit consent;
- no-match state offers useful next actions;
- alternatives are available after rejection or request;
- feedback is easy to submit;
- favorites work for guests and registered users;
- privacy and history controls are visible;
- careful mode fully blocks normal event recommendation actions;
- recommendation explanations are concrete and non-clinical;
- all important states have loading, empty, success, and error behavior;
- admin can complete the moderation flow without leaving the admin area.

### 7.1. Detailed Client Implementation Instructions

Use this section as the primary guide for building `apps/web`. The client must feel like a real working chatbot application, not a promotional page or static prototype.

#### Client Goal

Build a Vue web client that lets the user:

- start a recommendation dialogue immediately;
- provide city, state, age when required, budget, time, interests, company format, and restrictions;
- receive one safe recommendation with a clear explanation;
- approve showing an over-budget candidate only after explicit consent;
- request alternatives;
- rate or reject the recommendation with a reason;
- save an event or place to favorites;
- manage profile, privacy, history, and statistics consent;
- use a practical admin interface for moderation and safety rule management.

The first useful screen must be the chat. Do not start with a marketing landing page.

#### Recommended Client Stack

Use:

- Vue 3;
- Vite;
- TypeScript;
- Vue Router;
- Pinia for client state;
- native CSS modules or regular CSS files with CSS variables;
- `fetch` or a small typed wrapper around `fetch` for API calls;
- Vitest for unit/component tests;
- Playwright only when end-to-end UI flows are added.

Do not introduce a large UI framework unless the user explicitly asks for it. If a component library is added later, keep it consistent across the whole app.

Recommended client environment variables:

```text
VITE_API_BASE_URL=http://localhost:4000/api
VITE_ENABLE_ADMIN=true
VITE_APP_NAME=Я иду в театр!
```

Never expose backend secrets, model API keys, database credentials, or admin secrets in the client.

#### Client Routing

Create these routes first:

```text
/                  -> redirect to /chat
/chat              -> ChatView
/profile           -> ProfileView
/favorites         -> FavoritesView
/history           -> HistoryView
/help              -> HelpView
/admin             -> AdminView
/admin/events      -> AdminEventsView or tab inside AdminView
/admin/safety      -> AdminSafetyRulesView or tab inside AdminView
/admin/sources     -> AdminDataSourcesView or tab inside AdminView
```

Route rules:

- `/chat` must work for guests.
- `/profile`, `/favorites`, and `/history` may work with `anonymousSessionId` first and later with authenticated users.
- `/admin` routes must be visually separate from user routes.
- If authentication is not implemented in MVP, protect admin UI with a clear local-only guard or mock mode flag, not by pretending it is production-secure.

#### Client App Layout

Use a simple app shell:

- top bar with product name and primary navigation;
- main content area;
- optional compact bottom navigation on mobile;
- admin views may use their own sidebar or tabs.

Navigation items for MVP:

- Chat;
- Favorites;
- Profile;
- Help;
- Admin, only when enabled.

Keep navigation labels in Russian:

- "Чат";
- "Избранное";
- "Профиль";
- "Помощь";
- "Администрирование".

Do not put important workflow controls only in hidden menus. The primary chat action must always be obvious.

#### Visual Direction

The interface should be calm, practical, and supportive.

Design principles:

- prioritize readability over decoration;
- avoid clinical, hospital-like visuals;
- avoid childish or overly playful visuals;
- avoid aggressive colors for normal states;
- use warning colors only for real warnings;
- do not use dramatic crisis imagery;
- do not use large marketing hero sections;
- do not fill the UI with explanatory cards about features.

Suggested visual tone:

- light neutral background;
- readable text contrast;
- restrained accent color;
- rounded corners may be used, but keep cards and controls tidy;
- recommendation cards should look inspectable and information-rich;
- admin UI should be denser and more utilitarian than user chat UI.

Responsive behavior:

- mobile: single-column layout, chat input fixed or clearly reachable near the bottom;
- tablet: chat plus contextual panel can fit side by side if space allows;
- desktop: centered chat workspace with optional recommendation/details panel;
- admin desktop: tables with filters; admin mobile may degrade to stacked cards.

Suggested breakpoints:

```css
/* mobile first */
@media (min-width: 640px) { /* large phone / small tablet */ }
@media (min-width: 900px) { /* tablet / small desktop */ }
@media (min-width: 1200px) { /* desktop */ }
```

#### Client File Responsibilities

Use the project structure already described above. Keep responsibilities narrow:

- `main.ts`: create Vue app, install router and Pinia, mount app.
- `App.vue`: app shell and router outlet only.
- `router/index.ts`: route definitions and guards.
- `api/httpClient.ts`: base URL, JSON parsing, typed error handling, session headers.
- `api/chatApi.ts`: chat and recommendation calls.
- `api/profileApi.ts`: profile, privacy, history settings.
- `api/favoritesApi.ts`: favorite list, add, remove.
- `api/adminApi.ts`: admin events, safety rules, data sources.
- `stores/chatStore.ts`: chat state machine, messages, active recommendation.
- `stores/profileStore.ts`: profile, privacy settings, anonymous session id.
- `stores/adminStore.ts`: admin filters, moderation lists, selected event.
- `types/ui.ts`: local-only UI types that are not shared with backend.

Shared domain types should be imported from `packages/shared` instead of duplicated in `apps/web`.

#### Anonymous Session Handling

Guests must have an `anonymousSessionId` so recommendations, feedback, favorites, and history can work without registration.

Client rules:

- generate an `anonymousSessionId` on first app load if no user is authenticated;
- store it in `localStorage`;
- send it with API requests in a header, for example `X-Anonymous-Session-Id`;
- do not store sensitive message text in localStorage;
- allow the user to clear local history and reset the anonymous session.

Suggested localStorage keys:

```text
theater_bot_anonymous_session_id
theater_bot_profile_draft
theater_bot_privacy_settings
```

Only store drafts and non-sensitive preferences locally.

#### API Client Rules

`httpClient.ts` should:

- read `VITE_API_BASE_URL`;
- include `Content-Type: application/json`;
- include `X-Anonymous-Session-Id` when available;
- parse success and error responses consistently;
- throw typed client errors instead of raw `Response` objects;
- handle network failure with a user-friendly message;
- never expose stack traces in the UI.

Client error shape:

```ts
type ClientApiError = {
  code: string;
  message: string;
  details?: unknown;
  status?: number;
};
```

User-facing error examples:

- validation: "Проверьте введённые данные и попробуйте ещё раз."
- network: "Не удалось связаться с сервером. Попробуйте повторить запрос."
- no recommendation: "Сейчас не нашлось безопасного варианта по этим параметрам."
- careful mode: use careful-mode copy, not a red technical error.

#### Chat State Machine

Represent chat state explicitly. Do not infer the whole flow from message text.

Suggested states:

```ts
type ChatState =
  | "initial"
  | "collecting_city"
  | "collecting_state"
  | "collecting_age"
  | "collecting_preferences"
  | "loading_recommendation"
  | "recommendation_shown"
  | "needs_budget_consent"
  | "alternatives_shown"
  | "feedback_sent"
  | "no_safe_match"
  | "careful_mode"
  | "api_error";
```

The state machine should support:

- starting a new dialogue;
- continuing after clarifying questions;
- editing previously provided parameters;
- accepting an over-budget recommendation;
- rejecting an over-budget recommendation;
- requesting alternatives;
- sending feedback;
- switching to careful mode;
- resetting the dialogue.

Do not allow normal recommendation actions in `careful_mode`.

#### Chat Message Model

Suggested client-side message model:

```ts
type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  kind:
    | "text"
    | "question"
    | "recommendation"
    | "budget_consent"
    | "careful_mode"
    | "error";
  text?: string;
  createdAt: string;
  recommendationId?: string;
};
```

Message rules:

- user messages should appear immediately after submit;
- assistant loading state should be visible while waiting for API;
- errors should not erase previous messages;
- careful-mode messages should not include event cards;
- recommendation cards should be rendered as structured UI, not plain text only.

#### Chat Input And Parameter Collection

The chat should support both free text and structured controls.

Required controls:

- city select or city autocomplete;
- optional age input when age is needed;
- budget input;
- time preference select;
- interests chips or multi-select;
- company format select;
- restriction text field or chips;
- submit button;
- reset dialogue action.

Avoid collecting everything in one huge form before the chat starts. The interface may progressively ask for missing parameters.

Validation rules:

- city is required before recommendation search;
- budget must be a non-negative number when provided;
- age must be a reasonable number when provided;
- interests may be empty, but the bot should ask clarifying questions if state and interests are both vague;
- restrictions should be treated as safety-relevant text.

#### Recommendation Card Requirements

`RecommendationCard.vue` must support:

- event recommendation;
- place recommendation;
- no safe match state;
- over-budget consent state;
- loading skeleton or placeholder;
- unavailable/deleted event fallback.

Required fields:

- title;
- format;
- strategy or reason category;
- city;
- address;
- date/time;
- price or "бесплатно";
- age restriction label;
- source or organizer when available;
- rating when available;
- registration/ticket link;
- map link;
- explanation;
- safety note when relevant.

Required actions:

- "Подходит";
- "Не подходит";
- "Показать альтернативы";
- "Сохранить";
- "Открыть на карте";
- "Перейти к источнику";
- for over-budget: "Показать всё равно" and "Не показывать".

Do not show "Сохранить" or "Подходит" before the user consents to an over-budget option.

#### Feedback UX

When the user clicks "Не подходит", show rejection reasons:

- "Дорого";
- "Неинтересно";
- "Неудобное время";
- "Не тот формат";
- "Далеко";
- "Не подходит по возрасту";
- "Не хочу такую тему";
- "Другая причина".

Feedback rules:

- feedback should be sent to `/api/recommendations/:id/feedback`;
- the UI should confirm that feedback was saved;
- after rejection, offer alternatives when available;
- do not shame or pressure the user for rejecting a recommendation.

#### Careful Mode UX

Careful mode must be visibly different from normal recommendation flow, but not alarming.

Rules:

- no event cards;
- no "try this activity" recommendation;
- no diagnosis;
- no claim that the bot can provide emergency help;
- gentle text encouraging contact with trusted people or qualified help;
- optional button to start a new neutral dialogue after the user leaves this state;
- no celebratory or casual tone in careful mode.

Example careful-mode text:

```text
Мне жаль, что вам сейчас так тяжело. Я не экстренная служба и не специалист, поэтому не буду подбирать мероприятие в такой ситуации. Если есть риск для вашей безопасности, пожалуйста, обратитесь к человеку рядом, которому доверяете, или в местные экстренные службы.
```

Do not hardcode unverified phone numbers.

#### Profile View

`ProfileView.vue` should include:

- display name or nickname;
- age;
- default city;
- interests;
- usual budget;
- preferred formats;
- unwanted formats;
- restrictions;
- statistics consent;
- full message history consent;
- delete history action.

Privacy settings must be easy to find. Do not bury statistics consent in a long text block.

Profile save behavior:

- validate fields before submit;
- show loading state;
- show success state;
- show API error state;
- keep unsaved changes visible if save fails.

#### Favorites View

`FavoritesView.vue` should show saved events and places.

Required behavior:

- list saved items;
- distinguish event vs place;
- show city, date/time, price, and format;
- allow removing from favorites;
- allow opening source/map link;
- show empty state: "Пока здесь нет сохранённых вариантов."

If an event becomes archived or unavailable, show that status without crashing the UI.

#### History View

`HistoryView.vue` should show recommendation history only if history is enabled or available.

Required behavior:

- show past recommendations;
- show state category and strategy, not necessarily full user text;
- show feedback result when available;
- provide delete history action;
- explain briefly when history is disabled because of privacy settings.

Do not display full message text unless consent exists.

#### Help View

`HelpView.vue` should answer practical questions:

- what the bot does;
- what the bot does not do;
- how recommendations are formed;
- what data is used;
- how to delete history;
- how to disable statistics;
- what careful mode means.

Keep help concise and scannable. Avoid long legal-style walls of text.

#### Admin UI Requirements

Admin UI is part of the client, but its tone should be operational and compact.

Required admin screens or tabs:

- moderation queue;
- approved events;
- rejected events;
- event editor;
- safety rules;
- data sources;
- blacklist;
- basic statistics.

Admin event table columns:

- status;
- title;
- city;
- date/time;
- price;
- age;
- source;
- formats;
- strategies;
- safety tags;
- updated date;
- actions.

Admin filters:

- city;
- status;
- source;
- strategy;
- format;
- safety tag;
- date range;
- search by title.

Admin actions:

- approve;
- reject with reason;
- edit;
- archive;
- duplicate detection review;
- open source link;
- add safety tag;
- remove unsafe item.

Admin forms should not lose unsaved changes on validation errors.

#### Loading And Empty States

Every view must define loading, empty, and error states.

Examples:

- Chat loading: assistant typing indicator and disabled submit button.
- Favorites empty: "Пока здесь нет сохранённых вариантов."
- History empty: "История пока пустая."
- Admin empty: "Нет событий с выбранными фильтрами."
- Network error: "Не удалось загрузить данные. Попробуйте ещё раз."

Do not use raw backend error text directly if it contains technical details.

#### Accessibility Requirements

Minimum client accessibility:

- all buttons must be keyboard reachable;
- visible focus states;
- labels for inputs;
- `aria-live` region for new assistant messages or status updates;
- no color-only status indicators;
- sufficient contrast for normal, warning, and error text;
- semantic headings per view;
- recommendation card actions must have clear labels;
- loading states should not trap keyboard focus.

Chat-specific accessibility:

- keep message order logical in DOM;
- after sending a message, keep focus behavior predictable;
- do not auto-scroll in a way that prevents reading older content;
- announce important state changes such as careful mode and recommendation loaded.

#### Frontend Security And Privacy

Client must not:

- store API keys;
- store raw full dialogue text in localStorage;
- expose admin controls when admin mode is disabled;
- trust client-side validation as the only validation;
- render untrusted HTML from event descriptions or sources.

Render event descriptions as plain text unless sanitized on the backend and explicitly marked safe.

Links:

- external links should open in a new tab;
- use `rel="noopener noreferrer"`;
- show source domain when helpful;
- do not auto-open ticket or map links.

#### Component Testing Plan

Add tests for:

- chat state transitions;
- recommendation card rendering;
- over-budget consent state;
- careful-mode state;
- feedback reasons;
- profile privacy toggles;
- favorites empty and loaded states;
- admin event table filters.

Recommended test files:

```text
apps/web/src/components/recommendations/RecommendationCard.test.ts
apps/web/src/stores/chatStore.test.ts
apps/web/src/views/ChatView.test.ts
apps/web/src/views/ProfileView.test.ts
apps/web/src/components/admin/EventModerationTable.test.ts
```

Minimum manual browser checks:

- mobile width around 390px;
- tablet width around 768px;
- desktop width around 1440px;
- long Russian recommendation text;
- no result state;
- careful mode state;
- admin table with many rows;
- network error state.

#### Client Implementation Order

Build the client in this order:

1. Create Vite Vue TypeScript app.
2. Add router, Pinia, base CSS, and app shell.
3. Implement `httpClient.ts` and anonymous session creation.
4. Implement shared API response handling.
5. Build static `ChatView` with local mock messages.
6. Add `chatStore` state machine.
7. Add real `/api/chat/message` integration.
8. Build `RecommendationCard`.
9. Add budget consent flow.
10. Add feedback actions.
11. Add favorites flow.
12. Add profile and privacy settings.
13. Add history view.
14. Add admin event moderation MVP.
15. Add safety rules and data sources admin tabs.
16. Add component tests.
17. Run responsive and accessibility checks.

Do not start with admin UI before the user chat works.

#### Client Definition Of Done

Client MVP is complete when:

- `/chat` opens as the primary experience;
- user can complete a recommendation flow from the UI;
- all required chat states are represented;
- recommendation card displays required fields;
- over-budget consent works;
- careful mode hides normal event actions;
- feedback can be submitted;
- favorites can be added and removed;
- profile privacy toggles are visible and saveable;
- history can be viewed and deleted;
- admin can moderate seeded events;
- UI works on mobile and desktop;
- long Russian text does not break layout;
- no secret values are present in frontend code;
- component tests for chat state, recommendation card, and careful mode pass.

### 8. Data Model Rules

Use clear enum-like fields for statuses and categories.

Recommended event fields:

```ts
type EventStatus = "draft" | "pending_moderation" | "approved" | "rejected" | "archived";

type Event = {
  id: string;
  title: string;
  description: string;
  cityId: string;
  placeId?: string;
  address?: string;
  startsAt?: string;
  endsAt?: string;
  priceMin?: number;
  priceMax?: number;
  minAge?: number;
  ageRestrictionLabel?: string;
  sourceId?: string;
  sourceUrl?: string;
  formats: string[];
  strategyIds: string[];
  safetyTags: string[];
  moderationStatus: EventStatus;
  rating?: number;
  createdAt: string;
  updatedAt: string;
};
```

Recommended recommendation fields:

```ts
type RecommendationStatus = "recommended" | "needs_budget_consent" | "no_safe_match" | "careful_mode";

type Recommendation = {
  id: string;
  userId?: string;
  anonymousSessionId?: string;
  cityId: string;
  stateCategoryId: string;
  strategyId: string;
  status: RecommendationStatus;
  eventId?: string;
  placeId?: string;
  inputParameters: {
    userAge?: number;
    budget?: number;
    availableTime?: string;
    interests: string[];
    companyFormat?: string;
    restrictions: string[];
  };
  explanation: string;
  safetyDecision: "allowed" | "careful_mode" | "blocked";
  createdAt: string;
};
```

At least one of `userId` or `anonymousSessionId` must be present for recommendation, feedback, favorites, and history records.

Do not store full user message text by default. Store normalized parameters and category metadata unless the user consents to full history.

### 9. Testing Instructions

Add tests as soon as the backend services exist.

Minimum required tests:

- `safety.service.test.ts`
  - detects crisis phrases;
  - blocks unsafe event themes;
  - does not block normal cultural requests;
  - returns careful mode instead of recommendation for crisis text.

- `recommendation.service.test.ts`
  - maps fatigue/anxiety/loneliness to suitable strategies;
  - filters by city;
  - filters by budget;
  - filters by age restriction;
  - returns no-result response instead of inventing an event;
  - prefers approved events over pending/rejected events.

- `budgetFiltering.test.ts`
  - accepts free events;
  - accepts events within budget;
  - marks over-budget events as requiring explicit consent;
  - excludes expensive events when consent is absent.

- `privacyConsent.test.ts`
  - does not store full messages without consent;
  - stores anonymized metadata;
  - deletes history when requested;
  - respects statistics opt-out.

Frontend checks:

- recommendation card displays all required fields;
- careful-mode response does not show event actions;
- loading and error states are visible;
- long Russian text does not break layout;
- mobile width remains usable.

Before calling the task complete, run:

```text
pnpm typecheck
pnpm test
pnpm build
```

If a command cannot run because dependencies are not installed or external services are unavailable, document the reason clearly.

### 10. Seed Data Instructions

Create seed files for:

- 3-5 cities;
- all state categories;
- 3 strategies;
- 10-15 leisure formats;
- basic safety rules;
- 15-25 demo events across different formats, budgets, times, and age restrictions.

Seed data should include both safe and intentionally unsafe examples so filtering can be tested.

Example safe events:

- theater performance in the evening before 22:00;
- free exhibition;
- low-cost workshop;
- dance class;
- discussion club with neutral topic.

Example unsafe or blocked events:

- alcohol-centered night party;
- event with aggressive content;
- event with missing source and suspicious organizer;
- event outside user's age limits;
- event matching user's unwanted topics.

### 11. Admin Panel Instructions

Admin panel V1 does not need to be beautiful, but it must be useful.

Required admin tables:

- events pending moderation;
- approved events;
- rejected events;
- data sources;
- safety rules;
- blacklist items.

Required admin actions:

- approve event;
- reject event with reason;
- edit title, description, city, address, date/time, price, age restriction, source URL, formats, strategies, safety tags;
- create event manually;
- add safety rule;
- disable data source;
- add blacklist item.

Every moderation action should update `updatedAt` and store a moderation status. If authentication exists, store `moderatedBy`.

### 12. Documentation Instructions

Keep documentation close to implementation:

- `README.md`: how to run the app.
- `docs/api/endpoints.md`: API endpoint summary and example payloads.
- `docs/diagrams/*.puml`: PlantUML sources.
- `docs/diploma/README.md`: short note explaining how app implementation maps to diploma sections.

When implementation changes actors, use cases, data model, or recommendation flow, update the docs in the same task.

### 13. Definition Of Done For MVP

MVP is complete when:

- user can open the web app and use the chat;
- user can provide city, state, budget, and interests;
- backend returns a real recommendation from stored demo events;
- recommendation includes explanation and safety decision;
- unsafe/crisis requests trigger careful mode;
- user can rate a recommendation;
- user can save an event to favorites;
- admin can moderate events;
- event data can be seeded;
- safety and recommendation tests pass;
- README explains local setup;
- no secrets are committed.

## UML Use Case Decomposition

Large use-case diagrams should be split into smaller diagrams:

1. User recommendation scenario.
2. Registered user profile and personal features.
3. Admin panel.
4. External data loading and moderation.

This makes the diagrams readable and suitable for diploma documentation.

## Existing Workspace Notes

Current workspace contains diploma/documentation generation files, not a finished application codebase.

Important files:

- `fill_diploma_template.py` contains much of the current project/domain text.
- `implement_diploma_diagrams.py` contains previously generated diagram logic and textual descriptions.
- `to_chto_nuzhno.txt` contains methodological requirements for diploma sections.
- `Шаблон диплома заполненный.docx` and `КП(В4).docx` are generated/filled document artifacts.

When starting real app development in this repository, first inspect whether a frontend/backend project already exists. If not, scaffold it deliberately and keep diploma artifacts separate from application source code.

## Development Conventions For Future Agents

- Preserve Russian domain language and user-facing wording unless asked otherwise.
- Keep safety behavior explicit and testable.
- Do not add medical or psychological claims.
- Prefer small, readable modules over one large chatbot function.
- Keep recommendation explanation transparent: the user should understand why an option was selected.
- Store privacy-sensitive data conservatively.
- Add tests around safety filtering, recommendation selection, profile preferences, budget handling, and history/statistics consent.
- Before implementing, inspect the current repo state and avoid overwriting existing user work.
