# まなメモAI Agent Guide

This file is the canonical project guide for coding agents. Keep it short, durable, and linked to the source documents instead of duplicating every rule.

## Product Context

AI-assisted flashcard app. Users turn learning notes into AI-generated card candidates, review/adopt them manually, and study with spaced repetition. The project is intended for public release and monetization.

## Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- iOS: SwiftUI, Swift 6, iOS 17+, Xcode project under `ios/`
- Backend: Laravel API, PHP 8.3+, Sanctum SPA cookie auth
- Data: MySQL 8.0, Redis
- AI runtime: provider abstraction for OpenAI / Google / Anthropic-compatible expansion
- Infra: Docker Compose for development, VPS target for production

## Source Of Truth

- Requirements and phase plan: `docs/requirements.md`, `docs/01_mvp_phases.md`
- Personas and use cases: `docs/10_personas_use_cases.md`
- Redesign brief: `docs/11_design_redesign_brief.md`
- API contract: `docs/03_api_specification.md`
- Frontend architecture: `docs/05_frontend_design.md`
- iOS architecture: `docs/12_ios_design.md`
- Backend architecture: `docs/06_backend_design.md`
- Testing policy: `docs/07_testing_strategy.md`
- Runtime AI settings: `backend/config/ai.php`
- Agent skills: `.agents/skills/*/SKILL.md`
- Codex subagents: `.codex/agents/*.toml`
- Claude compatibility: `CLAUDE.md` imports this file; do not duplicate rules there.

If this file, a skill, and a design document disagree, follow the design document and update the stale agent guidance.

## Architecture Rules

- Backend uses Controller -> Service/domain service -> Repository with Interface First where the dependency is swappable or crosses a boundary.
- Repositories own Eloquent access for domain data. Do not query user-owned learning data directly from controllers or services.
- All user-owned learning data must be scoped by `user_id` in queries, policies, and tests.
- Laravel classes should be `final` by default and use constructor property promotion.
- Frontend follows Feature-Sliced Design: `app` -> `widgets` -> `features` -> `entities` -> `shared`.
- Feature-to-feature imports are not allowed. Share cross-feature code through `entities` or `shared`.
- iOS follows SwiftUI `App` / `Core` / `Features` / `Shared`; native auth uses Sanctum Bearer Token and Keychain.
- AI candidates are never auto-saved as accepted cards. Human review is required.
- AI generation routes use the named limiter `throttle:ai-generation`.

## Skill Triggers

Use the matching skill before writing files when the task matches the row.

| Task | Required skill |
| --- | --- |
| Create `frontend/src/features/<new>/` | `ui-new-feature` |
| Create a new `.tsx` component file | `ui-new-component` |
| Create a new `frontend/src/app/**/page.tsx` or `layout.tsx` | `ui-new-page` |
| Add a backend resource with table + CRUD API | `api-new-resource` |
| Add a new backend service class | `api-new-service` |
| Add a new migration file | `api-new-migration` |
| Review frontend code before commit/PR | `ui-review` |
| Review backend code before commit/PR | `api-review` |
| Create `ios/ManaMemoAI/Features/<new>/` or a major new SwiftUI screen | `ios-new-feature` |
| Review iOS code before commit/PR | `ios-review` |

Small edits to existing files, bug fixes, docs, and config-only changes do not need a scaffold skill unless the change becomes a broad refactor.

## Local Commands

Prefer Docker when checking integration behavior; local commands are fine for quick feedback if dependencies are installed.

```bash
docker compose up -d
docker compose exec backend php artisan migrate
docker compose exec backend php artisan test
docker compose exec backend ./vendor/bin/pint --test
docker compose exec frontend npm run lint
docker compose exec frontend npm run test:run
```

Known environment caveat: frontend tooling may fail on older Node 20 releases because newer dependencies expect newer Node APIs. Treat a startup failure from Node itself as an environment issue, not an app regression.

## Security Baseline

- Never commit real `.env` values or API keys.
- Keep auth throttling strict and use `throttle:ai-generation` for AI generation.
- Validate with FormRequest, authorize with Policy, and serialize responses with API Resource.
- Avoid rendering raw user content. Any `dangerouslySetInnerHTML` use must be audited and limited to non-user-controlled bootstrap data such as JSON-LD or theme scripts.
- Tests for user-owned resources should cover auth, validation, owner access, other-user isolation, and persistence side effects.

## Agent Config Hygiene

- Keep canonical project instructions here in `AGENTS.md`.
- Keep Claude-specific files as compatibility wrappers or Claude-native agent definitions only.
- Keep reusable workflow instructions in `.agents/skills`; do not mirror full skill bodies elsewhere.
- Keep tool-specific subagent definitions in their native directory, but reference this file and the design docs instead of copying long rules.
- When adding or removing a skill, update this trigger table and `.agents/README.md`.
