# Project board

Issues were tracked on a GitHub Project with a **Backlog → Todo → In Progress →
In Review → Testing → Done** workflow, grouped into five milestones and scheduled
with start and end dates.

**44 cards, all Done**, spanning 2026-05-11 to 2026-06-05. The board lives in the
original private repository; this is an export of the cards from the four-week MVP.
Later cards on the same board belong to the desktop application and are not included.

See [issues.md](issues.md) for the issue index and [pull-requests.md](pull-requests.md)
for the pull requests that closed them.

## Milestone 1 — Foundations

9 issues

| # | Title | Assigned to | Start | End |
|---:|---|---|---|---|
| 21 | #1 Monorepo + repository setup | @R-u-d, @waqvirk | 2026-05-11 | 2026-05-12 |
| 22 |  #2 Expo React Native app initialisation | @waqvirk | 2026-05-12 | 2026-05-13 |
| 23 |  #3 Django REST API initialisation | @R-u-d | 2026-05-13 | 2026-05-14 |
| 24 |  #4 GitHub Actions CI | @waqvirk | 2026-05-13 | 2026-05-14 |
| 27 | #5 AWS infrastructure provisioning | @R-u-d | 2026-05-13 | 2026-05-14 |
| 28 | #6 Sentry setup | @waqvirk | 2026-05-13 | 2026-05-14 |
| 30 | #8 Postman collection scaffold | @R-u-d | 2026-05-13 | 2026-05-14 |
| 29 | #7 design file + design system setup | @R-u-d, @waqvirk | 2026-05-14 | 2026-05-15 |
| 31 | #9 Design tokens in code | @waqvirk | 2026-05-14 | 2026-05-15 |

## Milestone 2 — Auth + Profiles

6 issues

| # | Title | Assigned to | Start | End |
|---:|---|---|---|---|
| 37 | #10 Backend: User model + auth endpoints | @R-u-d | 2026-05-18 | 2026-05-19 |
| 38 | #11 Backend: Avatar upload via S3 | @R-u-d | 2026-05-18 | 2026-05-20 |
| 39 | #12 Frontend: Axios client + interceptors | @waqvirk | 2026-05-19 | 2026-05-19 |
| 40 | #13 Frontend: TanStack Query setup | @waqvirk | 2026-05-19 | 2026-05-20 |
| 41 | #14 Frontend: Auth screens | @waqvirk | 2026-05-20 | 2026-05-21 |
| 42 | #15 Frontend: Profile screen + edit | @waqvirk | 2026-05-21 | 2026-05-21 |

## Milestone 3 — Communities + Channels

13 issues

| # | Title | Assigned to | Start | End |
|---:|---|---|---|---|
| 51 | #16 Backend: Community model + CRUD | @R-u-d | 2026-05-20 | 2026-05-21 |
| 52 | #17 Backend: Membership endpoints | @R-u-d | 2026-05-21 | 2026-05-21 |
| 53 | #18 Backend: Role-based permission classes | @R-u-d | 2026-05-21 | 2026-05-21 |
| 54 | #19 Backend: Channel model + CRUD | @R-u-d | 2026-05-22 | 2026-05-27 |
| 55 | #20 Backend: Post model + CRUD | @R-u-d | 2026-05-23 | 2026-05-27 |
| 60 | #21 Backend: Cover image upload (communities) | @R-u-d | 2026-05-23 | 2026-05-27 |
| 61 | #22 Frontend: Onboarding step 1 — interest picker | @waqvirk | 2026-05-23 | 2026-05-27 |
| 62 | #23 Frontend: Onboarding step 2 — join communities | @waqvirk | 2026-05-23 | 2026-05-27 |
| 63 | #24 Frontend: Onboarding step 3 — profile setup | @waqvirk | 2026-05-23 | 2026-05-27 |
| 64 | #25 Frontend: Discover screen | @waqvirk | 2026-05-24 | 2026-05-27 |
| 65 | #26 Frontend: Community detail screen | @waqvirk | 2026-05-25 | 2026-05-27 |
| 66 | #27 Frontend: Channel screen | @waqvirk | 2026-05-27 | 2026-05-28 |
| 67 | #28 Frontend: Create community screen | @waqvirk | 2026-05-27 | 2026-05-28 |

## Milestone 4 — Events + Feed + Notifications

10 issues

| # | Title | Assigned to | Start | End |
|---:|---|---|---|---|
| 79 | #29 Backend: Event model + CRUD | @R-u-d | 2026-05-27 | 2026-05-28 |
| 80 | #30 Backend: RSVP endpoints | @R-u-d | 2026-05-27 | 2026-05-28 |
| 81 | #31 Backend: Event cover image upload | @R-u-d | 2026-05-28 | 2026-05-29 |
| 82 | #32 Backend: Home feed endpoint | @R-u-d | 2026-05-28 | 2026-05-29 |
| 84 | #34 Frontend: Events tab screen | @waqvirk | 2026-05-28 | 2026-05-28 |
| 85 | #35 Frontend: Event detail screen | @waqvirk | 2026-05-28 | 2026-05-29 |
| 86 | #36 Frontend: Create event screen | @waqvirk | 2026-05-28 | 2026-06-01 |
| 83 | #33 Frontend: Home feed screen | @waqvirk | 2026-05-29 | 2026-06-02 |
| 88 | #38 Backend: Notification dispatch (Celery) | @R-u-d | 2026-05-29 | 2026-06-01 |
| 87 | #37 Frontend: Expo push notifications | @waqvirk | 2026-06-03 | 2026-06-05 |

## Milestone 5 — Polish + Release

6 issues

| # | Title | Assigned to | Start | End |
|---:|---|---|---|---|
| 104 | #39 Bug bash | @R-u-d, @waqvirk | 2026-06-01 | 2026-06-05 |
| 105 | #40 Feed performance pass | @R-u-d | 2026-06-04 | 2026-06-05 |
| 106 | #41 Skeleton loaders + error + empty states | @R-u-d | 2026-06-04 | 2026-06-05 |
| 107 | #42 Onboarding polish | @R-u-d, @waqvirk | 2026-06-04 | 2026-06-05 |
| 108 | #43 Community type colour audit | @R-u-d | 2026-06-04 | 2026-06-05 |
| 109 | #44 README rewrite | @R-u-d, @waqvirk | 2026-06-04 | 2026-06-05 |
