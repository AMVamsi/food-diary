# AI Usage Disclosure

This file records all changes — AI-assisted and manual — for every commit.
The pre-commit hook verifies that an entry matching the commit's [log:slug] token exists.

For AI entries: fill all columns.
For manual entries: use slug `manual`, set Tool=manual, leave What/Verified/Modifications as `—`.

---

## Entries

| Commit slug | Date | Tool | Issue | Files | What was generated | How verified | Modifications |
|-------------|------|------|-------|-------|--------------------|--------------|---------------|
| manual | 2026-04-29 | manual | #1 | .gitignore, README.md AI_USAGE.md DEV_LOG.md .env.example .githooks/ .github/| — | — | — |
| scaffold | 2026-04-29 | Claude | #1 | backend/app/main.py, requirements.txt | FastAPI skeleton, folder structure | Read every file, ran /health locally | Adjusted CORS origins |
| manual | 2026-04-30 | manual | #2 |  .github/COPILOT_INSTRUCTIONs.md AI_USAGE.md DEV_LOG.md | AI guardrails, implementation log | — |  progress updated|
| product | 2026-04-30 | Claude | #2 |  PRODUCT.md, PROJECT_STATE.md | product details for the agent | Read every file, verified across source documents and github issues manually | initial scope |
