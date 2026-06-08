# Codex Agents

Codex subagent definitions live here as tool-specific TOML files. Keep shared project guidance in `AGENTS.md` and reusable scaffold/review workflows in `.agents/skills`.

## Agents

| Agent | Use when |
| --- | --- |
| `architecture-reviewer` | Reviewing cross-cutting architecture and layer boundaries |
| `security-reviewer` | Reviewing auth, authorization, data isolation, XSS, secrets, and AI key handling |
| `ux-reviewer` | Reviewing frontend UX, responsive behavior, and accessibility |
| `fullstack-implementer` | Implementing larger backend + frontend changes |
| `test-writer` | Adding or improving PHPUnit, Vitest, or E2E coverage |
| `ios-implementer` | Implementing SwiftUI iOS client changes |
| `ios-reviewer` | Reviewing SwiftUI iOS client changes |

When a task matches the trigger table in `AGENTS.md`, use the required skill before relying on a general-purpose subagent.
