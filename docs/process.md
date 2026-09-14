# How this was built

A four-week final project at WBS Coding School, 12 May – 8 June 2026, by two developers.

## The numbers

| | |
|:--|--:|
| Duration | 4 weeks |
| Developers | 2 |
| Pull requests merged | 52 |
| Commits (excluding merges) | 182 |

**Reviews went both ways.** Every one of my teammate's 26 merged pull requests was reviewed
by me; 25 of my 26 were reviewed by him. Three further pull requests of mine were closed
unmerged (#96, #100, #101) after being superseded — a superseded pull request never got a
review, which is why the merged count and the reviewed count differ.

### The one that merged without a review

One merged pull request has no review on it: **#114**, which was also the last thing we
merged. It went in near the end, in a batch with six others that were all reviewed.

Twenty lines in `app/app.config.js` — build configuration, nothing the app runs.

What makes it worth writing down is which one it was. Its description ends with a list of
things still outstanding, and most of them sat in my teammate's accounts: the Firebase
services file, an EAS secret, the `owner` field. So the one pull request that skipped a
review is the one where his review was hardest to replace.

## How we worked

- **Issue-driven, with exceptions.** 44 issues were opened and closed, and most branches
  carry their issue number: `feat/32-home-feed-endpoint`, `fix/40-feed-performance`,
  `chore/43-community-type-colour-audit`. Five of the 52 merged pull requests do not fit
  that pattern — #68, #70 and #103 were small fixes branched without an issue, and #114
  and #116 cite numbers (`#46`, `#49`) that were never opened as issues. The honest
  version: the issue tracker held the planned work; late polish sometimes went straight
  to a branch.
- **Branch naming** followed `<type>/<issue-number>-<slug>`, with `feat`, `fix`, `chore`,
  `docs` and `test` as the types.
- **`dev` was the integration branch.** Feature branches merged into `dev` through reviewed
  pull requests; `main` only received releases.
- **CI ran on every PR.** Typecheck, eslint and jest for the app; ruff and pytest against a
  real Postgres instance for the API. Pre-commit hooks ran the same checks locally before
  anything left the machine. The backend job was still being stabilised in the first week —
  seven pull requests (#32, #33, #34, #35, #36, #44, #45) merged with it red, the last of
  them on 19 May. From PR #46 onwards no pull request merged with a failing check.
- **A bug bash before the deadline** (`fix/39-bug-bash`) — a focused pass where both of us
  went hunting rather than building.

## Who did what

| | Waqar ([@waqvirk](https://github.com/waqvirk)) | Rud ([@R-u-d](https://github.com/R-u-d)) |
|:--|:--|:--|
| Lead | Frontend | Backend |
| Main areas | Screens, components, navigation, app test suite, assets, CI workflows, pre-commit setup | API apps and models, auth and user profiles, Django settings and core, Postman collection, AWS infrastructure docs |
| Crossover | Contributed substantially to the API as well | Built several screens and the client data layer |

Neither of us stayed on one side of the stack. The split above describes where each of us
carried the weight, not where we were allowed to work.

## What this looked like

All 52 merged pull requests of the four-week MVP, oldest first:

<img src="screenshots/process-pull-requests.png" alt="GitHub pull request list in the original repository, filtered to merged pull requests between 12 May and 8 June 2026, showing 52 results">

A review with substance — three concrete findings, then an approve:

<img src="screenshots/process-review-thread.png" alt="Pull request #36: review by waqvirk listing three issues with the Postman collection, followed by an approval and merge" width="700">

Most of the other 51 reviews were shorter than this one; several were a plain approve with
no comment. The claim here is that every pull request had a second reader before it merged,
not that every one produced a discussion.

The pull requests themselves live in the original private repository, which continued as a
desktop application. Their index is exported to [pull-requests.md](pull-requests.md), and
the issues they closed to [issues.md](issues.md). The project board that scheduled the
work — five milestones, start and end dates — is exported to
[project-board.md](project-board.md). The numbers and branch names in them match the
merge commits in `git log`.