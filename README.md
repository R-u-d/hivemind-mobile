# HiveMind Mobile

A community-based mobile app where people discover events, join study groups, connect with
gamers, and find hobby communities — all in one place. Built with React Native (Expo) and
Django REST Framework as a 4-week final project at WBS Coding School, 12 May – 8 June 2026,
by [@R-u-d](https://github.com/R-u-d) and [@waqvirk](https://github.com/waqvirk).

The product is called HiveMind; this repository is its mobile client. A desktop client,
HiveMind Desktop, came later and lives elsewhere — see
[Where this went](#where-this-went).

---

<img src="docs/hero.png" alt="HiveMind — Join. Sync. Evolve.">

---

> **Scope**
>
> This repository holds the history of the four-week MVP up to the
> [`bootcamp-mvp`](../../releases/tag/bootcamp-mvp) tag: 52 merged pull requests, two
> developers, 51 of them reviewed by the other one. See [docs/process.md](docs/process.md)
> for how we worked.
>
> The original repository stays private — later, unrelated work continued there. The
> pull requests and reviews live in that repository, so their index is exported to
> [docs/pull-requests.md](docs/pull-requests.md), [docs/issues.md](docs/issues.md) and
> [docs/project-board.md](docs/project-board.md); the numbers and branch names in them
> match the merge commits in `git log` here.

---

## Screenshots

### Dark

| Feed | Discover | Events |
|---|---|---|
| <img src="docs/screenshots/01-home-feed.png" alt="Home feed" width="240"> | <img src="docs/screenshots/02-discover.png" alt="Discover communities" width="240"> | <img src="docs/screenshots/03-events.png" alt="Event list" width="240"> |

| Event detail | Community detail | Channel |
|---|---|---|
| <img src="docs/screenshots/04-event-detail.png" alt="Event detail with RSVP" width="240"> | <img src="docs/screenshots/05-community-detail.png" alt="Community detail with channels" width="240"> | <img src="docs/screenshots/06-channel.png" alt="Channel with posts" width="240"> |

### Light

| Feed | Discover | Events |
|---|---|---|
| <img src="docs/screenshots/01-home-feed-light.png" alt="Home feed, light" width="240"> | <img src="docs/screenshots/02-discover-light.png" alt="Discover communities, light" width="240"> | <img src="docs/screenshots/03-events-light.png" alt="Event list, light" width="240"> |

| Event detail | Community detail | Channel |
|---|---|---|
| <img src="docs/screenshots/04-event-detail-light.png" alt="Event detail with RSVP, light" width="240"> | <img src="docs/screenshots/05-community-detail-light.png" alt="Community detail with channels, light" width="240"> | <img src="docs/screenshots/06-channel-light.png" alt="Channel with posts, light" width="240"> |

> The app follows the system theme. Captured on an iOS simulator against a locally
> seeded database.

### Loading, empty and error states

| Loading | Empty feed | Nothing coming up |
|---|---|---|
| <img src="docs/screenshots/10-loading-skeleton.png" alt="Feed skeleton while loading" width="240"> | <img src="docs/screenshots/07-empty-feed.png" alt="Empty feed for a new account" width="240"> | <img src="docs/screenshots/08-empty-events.png" alt="Empty events list" width="240"> |

| Request failed | Form validation | Splash |
|---|---|---|
| <img src="docs/screenshots/09-error-state.png" alt="Error state with retry" width="240"> | <img src="docs/screenshots/11-form-validation.png" alt="Inline validation on the sign-in form" width="240"> | <img src="docs/screenshots/15-splash.png" alt="Animated splash screen on launch" width="240"> |

> <p>Every tab has a skeleton, an empty state and an error state with a retry; forms
> validate inline with Zod — see <br>
`src/components/FeedSkeleton.tsx`, `EmptyState.tsx` and `TabErrorState.tsx`.</p>

### More screens

| Event detail with map | Create an event | Notifications |
|---|---|---|
| <img src="docs/screenshots/12-event-detail-map.png" alt="Event detail with map, capacity bar and RSVP" width="240"> | <img src="docs/screenshots/13-create-event.png" alt="Create event form with cover upload and map pin" width="240"> | <img src="docs/screenshots/14-notifications.png" alt="Notifications sheet with swipe to mark read" width="240"> |

> Captured on a physical device during development and attached to the pull
> requests that built these screens.

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
| Distribution | EAS Build (internal distribution APK) |

---

## Project structure

```
hivemind-mobile/
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
git clone https://github.com/R-u-d/hivemind-mobile.git
cd hivemind-mobile
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

> The MVP was distributed as an internal APK. No build was ever submitted to TestFlight
> or the Play Console — `eas.json` has no `submit` configuration for that reason.

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

| Name | Role | GitHub | Main areas |
|---|---|---|---|
| Waqar | Frontend lead | [@waqvirk](https://github.com/waqvirk) | Screens, components, navigation, app test suite, CI workflows |
| Rud | Backend lead | [@R-u-d](https://github.com/R-u-d) | API apps and models, auth and profiles, Django config, Postman collection, AWS docs |

Both of us worked across the whole stack — the split above only describes where each of us
carried the weight. See [docs/process.md](docs/process.md) for branching, reviews, and CI.

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

### Where this went

Most of that list got built after the bootcamp. The project continued as HiveMind Desktop —
a self-hosted voice and screenshare platform with real-time channels, running on its own
server and in daily use. Its architecture and the decisions behind it are documented
separately. Link to follow.

---

## License

MIT — see [LICENSE](LICENSE)
