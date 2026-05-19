# Git conventions

Everything in this file is not a hard rule, just a suggestion.
Consistent conventions mean the git history is readable, searchable, and useful in interviews.

---

## Branch naming

```
type/issue-number-short-description
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature or user-facing behaviour |
| `fix` | Bug fix |
| `chore` | Setup, config, maintenance, dependencies |
| `docs` | README, diagrams, team docs |
| `refactor` | Code improvement with no behaviour change |
| `test` | Adding or fixing tests only |

### Examples

```bash
feat/16-community-crud
feat/27-channel-screen-with-polling
fix/39-feed-crash-empty-list
fix/30-rsvp-capacity-enforcement
chore/4-github-actions-ci
chore/46-eas-build-configuration
docs/44-readme-rewrite
refactor/40-flashlist-performance-pass
```

### Rules

- Lowercase only
- Hyphens only — no underscores, no spaces, no slashes inside the description
- Always include the issue number
- Keep the description short: 3–5 words is enough
- Branch off `dev` unless explicitly building on another feature branch

---

## Commit messages (on feature branches)

```
short present-tense description of what this commit does
```

### Good examples

```
add channel FlashList with cursor pagination
wire up optimistic post insert with rollback
fix 401 retry not clearing auth store
add IsCommunityMember permission class
seed 50 communities for discover screen test
```

### Bad examples

```
wip
fix
update
changes
stuff
asdf
```

If you can't describe what a commit does in a sentence, it probably does too many things.
Split it.

### Frequency

Commit when a meaningful unit of work is complete — not every 5 minutes, not only once
at the end of a full day.

---

## Squash commit messages (on merge to main)

This is the commit that matters. It lives in `main` forever and should be readable
by someone who wasn't in the room.

### Format

```
type(#issue): short description of what this adds or fixes
```

### Examples

```
feat(#16): community CRUD with membership and role-based permissions
feat(#27): channel screen with REST-polled posts and optimistic insert
fix(#39): feed crash when user has no community memberships
chore(#4): github actions CI for frontend (tsc+eslint+jest) and backend (pytest+ruff)
docs(#44): README rewrite with screenshots and architecture diagram
refactor(#40): replace FlatList with FlashList across all screens, add expo-image
```

### Rules

- The `#issue` number makes every commit searchable and linkable to the ticket
- Present tense: "add", "fix", "update" — not "added", "fixed", "updated"
- No full stop at the end
- Keep it under 72 characters
- If there's important context (e.g. a non-obvious architectural decision), add it in the
  extended commit description — but the first line should stand alone

---

## Branch protection rules

| Branch | Base | Approvals to merge |
|---|---|---|
| `main` | — | 2 |
| `dev` | `main` | 1 |
| feature branches | `dev` | — |

The flow is always: **feature branch → `dev` → `main`**. Never skip a step.

### Never push directly to `dev` or `main`

Both are protected. Every change goes through a PR with passing CI.
This is a hard GitHub branch protection rule, not a social convention.

### Never force-push to `dev` or `main`

If something is wrong with a commit on a protected branch, use `git revert`. Don't rewrite history
on a shared branch — it breaks everyone else's local clone.

Force-push is allowed on your own feature branches before a PR is opened.
After a PR is opened and reviewed, avoid force-push — it makes review comments stale.

---

## Tagging

We don't use tags during development. After the production EAS build is approved
(ticket #47), tag the commit:

```bash
git tag v1.0.0-beta
git push origin v1.0.0-beta
```

---

## .gitignore — what never gets committed

The root `.gitignore` covers:

```
# environment files
.env
.env.local
.env.production

# Expo
.expo/
dist/

# Python
__pycache__/
*.pyc
*.pyo
venv/
.venv/
*.egg-info/

# Node
node_modules/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json
.idea/
*.swp

# Test coverage
coverage/
.coverage
htmlcov/

# Build artefacts
build/
*.ipa
*.apk
*.aab
```

If you find yourself wanting to commit something in these categories — stop and ask why.
The answer is almost always "put it in .env.example instead."

---

## Quick reference

```bash
# start a new ticket
git checkout dev
git pull origin dev
git checkout -b feat/27-channel-screen

# save work during the day
git add .                         # or specific files: git add src/components/Card.tsx
git commit -m "add FlashList with cursor pagination"

# before opening PR to dev
git fetch origin
git rebase origin/dev
git push origin feat/27-channel-screen

# after PR is approved and squash-merged into dev
git checkout dev
git pull origin dev
git branch -d feat/27-channel-screen   # delete local branch
```
