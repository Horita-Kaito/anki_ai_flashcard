# Project Agent Skills

Reusable project skills live in `.agents/skills/*/SKILL.md`. These are the single source for scaffold and review workflows shared across agent harnesses.

## Skills

| Skill | Use when |
| --- | --- |
| `ui-new-feature` | Creating a new frontend feature directory |
| `ui-new-component` | Creating a new TSX component file |
| `ui-new-page` | Creating a new App Router page or layout |
| `ui-review` | Reviewing frontend code before commit or PR |
| `api-new-resource` | Creating a backend resource with table and CRUD API |
| `api-new-service` | Creating a new backend service class |
| `api-new-migration` | Creating a new migration file |
| `api-review` | Reviewing backend code before commit or PR |
| `ios-new-feature` | Creating a new SwiftUI iOS feature under `ios/Tessera/Features/` |
| `ios-review` | Reviewing iOS Swift/SwiftUI code before commit or PR |

## Maintenance

- `AGENTS.md` owns the trigger table.
- `docs/05_frontend_design.md`, `docs/06_backend_design.md`, `docs/12_ios_design.md`, `docs/13_ios_local_first_architecture.md`, and `docs/07_testing_strategy.md` remain canonical for implementation rules.
- Keep skills focused on repeatable workflow steps. Put broad project context in `AGENTS.md`, not in every skill.
- Do not store secrets, local paths, or personal preferences here.
