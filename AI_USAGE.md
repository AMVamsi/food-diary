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
| manual | 2026-04-30 | manual | #2 |  .github/COPILOT_INSTRUCTIONS.md AI_USAGE.md DEV_LOG.md | AI guardrails, implementation log | — |  progress updated|
| ai-guardrails | 2026-04-30 | Claude | #2 |  PRODUCT.md, PROJECT_STATE.md | product details for the agent | Read every file, verified across source documents and github issues manually | initial scope |
| setup | 2026-04-30 | Claude | #2 | .githooks/commit-msg, setup.sh, ai-usage-check.yml | ci rules, setup script, github workflows | Read every file, ran pre-commit checks, github workflows documentation | initial workflow setup |
| manual | 2026-04-30 | manual | #2 | .githooks/commit-msg, .github/workflows/ai-usage-check.yml | removed manual-slug bypass so manual commits also require AI_USAGE.md row | reviewed both files | — |
| PR_1 | 2026-04-30 | Copilot | PR | .githooks/commit-msg, ai-usage-check.yml, backend/app/main.py, PR CI checks | minor changes, PR reviewed | Manual review and accepted the changes once verified | Automated PR review by copilot |
| slug | 2026-04-30 | Claude | —  | .githooks/commit-msg, .github/workflows/ai-usage-check.yml | logic to resolve failing ci in copilot PR suggestions and auto PR merge to main  | manually reviewed before updating | adjusted as needed |
| ai_instruction  | 2026-04-30 | manual          | —  | COPILOT_INSTRUCTIONS.md | commit message include to avoid future ci failure       | —                        | —             |
| manual  | 2026-04-30 | manual          | —  | various | no AI assistance used        | —                        | —             |
| copilot | 2026-04-30 | GitHub Copilot  | —  | various | code review and suggestions  | reviewed before accepting | adjusted as needed |
| docker | 2026-04-30 | manual  | —  | backend/Dockerfile backend/.dockerignore | script to build backend in railway deployment | verified from docker documentation and build was successful locally | initial docker file |
| copilot | 2026-04-30 | GitHub Copilot | — | various | code review suggestions accepted via GitHub UI | reviewed each suggestion before accepting | adjusted as needed |
| manual  | 2026-04-30 | manual | — | various | no AI assistance | — | — |
| depend  | 2026-04-30 | manual | — | backend/requirements.txt, .githooks/commit-msg, .github/workflows/ai-usage-check.yml | build failure dependencies resolved for railway + docker, skipped AI-Usage ci error when triggered by copilot during PR or merged to main | local build successful + documentation verified | packages version updated | 