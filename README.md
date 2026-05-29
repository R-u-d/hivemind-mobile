# HiveMind

A community-based mobile app where people discover events, join study groups, connect with
gamers, and find hobby communities — all in one place.

Built with React Native (Expo) and Django REST Framework as a 4-week final project
at WBS Coding School.

---

## Screenshots

> _Coming in Week 4 — onboarding, feed, community detail, channel, event detail, profile_

---

## What it does

- Join communities by type: student, gamer, hobby, sports, music
- Browse a mixed feed of posts and events from your communities
- Post in community channels (announcements, general, events)
- Create and RSVP to virtual or real-world events with location and capacity
- Get push notifications for community activity and upcoming events
- Discover and join new communities by type or keyword search

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
| Database | PostgreSQL (AWS RDS or Azure) |
| File storage | AWS S3 (presigned URLs) or Azure |
| Hosting | AWS EC2 or Azure |
| Notifications | Expo Push Notifications + Celery |
| Error tracking | Sentry |
| CI | GitHub Actions |
| Distribution | EAS Build + TestFlight + Play Console |

---

## Project structure

```
HiveMind/
├── app/          React Native frontend (Expo)
├── api/          Django REST API
├── docs/         Architecture, API collection, team docs, wireframes
└── .github/      CI workflows, issue templates, PR template
```

---

## Local setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL running locally
- Expo Go app on your phone (for development)
- An `.env.local` (frontend) and `.env` (backend) — see `.env.example` in each folder

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
EXPO_PUBLIC_API_URL=http://localhost:8000/api
EXPO_PUBLIC_SENTRY_DSN=          # leave blank for local dev
```

Start the dev server:

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `i` for iOS simulator / `a` for Android emulator.

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
AWS_ACCESS_KEY_ID=               # leave blank for local dev (S3 uploads won't work)
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=
AWS_S3_REGION_NAME=eu-central-1
SENTRY_DSN=                      # leave blank for local dev
```

Create the database and run migrations:

```bash
createdb hivemind                 # or create via psql / pgAdmin
python manage.py migrate
python manage.py runserver
```

Health check — open in browser or Postman:

```
GET http://localhost:8000/api/health/
→ { "status": "ok" }
```

---

### 4. Verify both are running

| Service | URL |
|---|---|
| API health | http://localhost:8000/api/health/ |
| Expo dev server | http://localhost:8081 |
| Django admin | http://localhost:8000/admin/ |

---

## Running tests

```bash
# Frontend
cd app && npm test

# Backend
cd api && pytest
```

---

## API documentation

Postman / Hoppscotch collection: [`docs/api/collection.json`](docs/api/collection.json)

Import the collection, set the `base_url` environment variable to `http://localhost:8000`,
then register a user and log in — the login request automatically sets `auth_token`.

---

## Architecture

![Architecture diagram](docs/architecture.png)

> _Diagram added in Week 4_

---

## Team

| Name | Role | GitHub |
|---|---|---|
| Waqar | Frontend lead | [@waqvirk](https://github.com/waqvirk) |
| Rud | Backend lead | [@R-u-d](https://github.com/R-u-d) |

---

## Team docs

- [Workflow and PR process](docs/team/workflow.md)
- [Git conventions](docs/team/git-conventions.md)
- [Definition of done](docs/team/definition-of-done.md)
- [Architectural decisions](docs/team/decisions/)

---

## Roadmap — what comes after v1

Features deliberately cut from the 4-week MVP, planned for v2:

- **Real-time text channels** — WebSockets via Django Channels + Redis (currently REST-polled)
- **Voice channels** — Livekit integration
- **Direct messages** — 1:1 messaging between community members
- **QR event check-in** — scan to mark attendance
- **Calendar sync** — export RSVPd events to Google / Apple Calendar
- **Community moderation tools** — ban, mute, report
- **AI study summaries** — LLM-generated summaries of channel activity

---

## Known issues

> _Populated during Week 4 bug bash_

---

## License

MIT — see [LICENSE](LICENSE)