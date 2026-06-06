# HiveMind

A community-based mobile app where people discover events, join study groups, connect with
gamers, and find hobby communities — all in one place.

Built with React Native (Expo) and Django REST Framework as a 4-week final project
at WBS Coding School.

---

## Screenshots

> _Coming soon — see [#48](https://github.com/R-u-d/HiveMind/issues/48)_

---

## What it does

- Join communities by type: study, gaming, sports, creative, social
- Browse a mixed home feed of posts and events from your communities
- Post in community channels (general, announcements, events, media, help)
- Create and RSVP to virtual or real-world events with location pin and capacity limit
- Get push notifications for new posts, events, RSVPs, and member joins
- Discover and join new communities by type or keyword search
- Deep-link directly to the relevant screen when tapping a notification

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile app | React Native + Expo SDK 54 |
| Routing | Expo Router (file-based) |
| Language | TypeScript (strict) |
| HTTP client | Axios with JWT interceptors |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Backend | Django 5.2 + Django REST Framework |
| Auth | JWT via djangorestframework-simplejwt |
| Database | PostgreSQL (AWS RDS) |
| File storage | AWS S3 (presigned URLs) |
| Hosting | AWS EC2 |
| Async tasks | Celery + Redis |
| Notifications | Expo Push Notifications |
| Error tracking | Sentry |
| CI | GitHub Actions |
| Distribution | EAS Build + TestFlight + Play Console |

---

## Project structure

```
HiveMind/
├── app/          React Native frontend (Expo)
├── api/          Django REST API
├── docs/         API collection, team docs, wireframes
└── .github/      CI workflows, issue templates, PR template
```

---

## Local setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL running locally
- Redis running locally — required for Celery (push notification dispatch)
  ```bash
  brew install redis && brew services start redis   # macOS
  # or: docker run -p 6379:6379 redis:7-alpine
  ```
- Expo Go on your phone, or an iOS/Android simulator
- `.env.local` (frontend) and `.env` (backend) — copy from `.env.example` in each folder

---

### 1. Clone the repo

```bash
git clone https://github.com/R-u-d/HiveMind.git
cd HiveMind
```

---

### 2. Frontend (app/)

```bash
cd app
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8000/api
EXPO_PUBLIC_SENTRY_DSN=          # leave blank for local dev
EXPO_PUBLIC_GOOGLE_MAPS_KEY=     # Android maps (optional for local dev)
```

> **LAN IP, not localhost:** Expo Go on a physical device can't reach `localhost` on your
> machine. Use your machine's local IP (e.g. `192.168.1.x`). Run `ipconfig` (Windows) or
> `ifconfig` (Mac/Linux) to find it.

Start the dev server:

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `i` for iOS simulator / `a` for Android emulator.

---

### 3. Backend (api/)

```bash
cd api
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Open `.env` and fill in:

```
SECRET_KEY=any-random-string-for-local-dev
DEBUG=True
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/hivemind
CELERY_BROKER_URL=redis://localhost:6379/0
AWS_ACCESS_KEY_ID=               # leave blank for local dev (S3 uploads won't work)
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=
AWS_S3_REGION_NAME=eu-central-1
SENTRY_DSN=                      # leave blank for local dev
```

Create the database, run migrations, and seed sample data:

```bash
createdb hivemind                 # or create via psql / pgAdmin
python manage.py migrate
python manage.py seed_all         # communities, channels, events, posts & notifications
python manage.py runserver
```

> `seed_all` fills the database with development data in one step. Register your own
> account in the app to log in — seeded users exist only to populate content.
> Re-running `seed_all` is safe; it refreshes events/posts and tops up the rest.

Health check:

```
GET http://localhost:8000/api/health/
→ { "status": "ok" }
```

---

### 4. Pre-commit hooks

The repo ships with pre-commit hooks that run automatically on every `git commit`:

- **`api/` changes** → ruff (lint) + pytest
- **`app/` changes** → eslint + typecheck + jest

Activate them once after cloning (requires the backend venv to be set up first):

```bash
pip install -r api/requirements-dev.txt
pre-commit install
```

> **Note:** pytest requires `DATABASE_URL` in your shell environment. Export it before
> committing or the hook will fail with a database connection error.

---

### 5. Verify both are running

| Service | URL |
|---|---|
| API health | http://localhost:8000/api/health/ |
| Expo dev server | http://localhost:8081 |
| Django admin | http://localhost:8000/admin/ |

---

## EAS builds (Android / iOS)

EAS builds run on Expo's cloud servers. There is **no `.env.production` file** — all
build-time secrets are managed as EAS environment variables.

### One-time setup

```bash
cd app
npm install -g eas-cli
eas login
```

Set required environment variables on EAS (run once per variable):

```bash
# Plaintext — visible in build logs
eas env:create --name EXPO_PUBLIC_API_URL --value "https://api.your-domain.com/api" --environment production --visibility plaintext

# Sensitive — hidden in logs
eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value "https://..." --environment production --visibility sensitive
eas env:create --name SENTRY_AUTH_TOKEN --value "sntrys_..." --environment production --visibility sensitive

# File — google-services.json for Android push notifications (FCM)
eas env:create --name GOOGLE_SERVICES_JSON --type file --visibility secret --environment production
# (paste the file contents when prompted)
```

### Trigger a build

```bash
cd app
eas build --platform android --profile preview   # produces a shareable APK
eas build --platform ios --profile preview        # requires Apple Developer account
```

---

## Running tests

```bash
# Frontend
cd app && npm test

# Backend (requires DATABASE_URL in env)
cd api && pytest
```

---

## API documentation

Postman collection: [`docs/api/collection.json`](docs/api/collection.json)

Import the collection and set `base_url` to `http://localhost:8000`. Register a user and
log in — the login request stores `auth_token` automatically for subsequent requests.

---

## CI

Two workflows run on every PR to `dev` and `main`:

| Workflow | Steps |
|---|---|
| **App CI** | typecheck → eslint → jest |
| **API CI** | ruff → pytest (against a real Postgres DB) |

---

## Team

| Name | Role | GitHub |
|---|---|---|
| Waqar | Frontend lead | [@waqvirk](https://github.com/waqvirk) |
| Rud | Backend lead | [@R-u-d](https://github.com/R-u-d) |

---

## Team docs

- [Git conventions](docs/team/git-conventions.md)

---

## Roadmap — what comes after v1

Features deliberately cut from the 4-week MVP, planned for v2:

- **Real-time text channels** — WebSockets via Django Channels + Redis (currently REST-polled)
- **Voice channels** — LiveKit integration
- **Direct messages** — 1:1 messaging between community members
- **QR event check-in** — scan to mark attendance
- **Calendar sync** — export RSVPd events to Google / Apple Calendar
- **Community moderation tools** — ban, mute, report
- **AI study summaries** — LLM-generated summaries of channel activity

---

## License

MIT — see [LICENSE](LICENSE)
