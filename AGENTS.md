# AGENTS.md

**em** is a TypeScript/React/Redux web app that runs as a PWA or through Capacitor on mobile, and as a PWA or through Tauri on desktop.

## Working in this repo

**1. Reproduce before theorising.** If you are fixing reported behaviour, try observing the failure yourself before making assumptions. An agent that starts from the code builds a theory and then finds evidence for it; one that has watched the thing fail is working from an observation.

**2. Suggest `end-session` when the work is wrapping up.** As the user starts to finish — pushing, opening a pull request, handing the change on — offer executing `end-session` to the user. It checks that documentation still describes reality, that nothing is uncommitted or unpushed, that no test was left switched off, and that anything claimed was actually observed.

**3. Attribute agent-authored commits consistently.** End every commit an agent authors with exactly one trailer in this form: `Co-Authored-By: {agent} {model} ({context-window} context) <{vendor-noreply-email}>`. Codex uses `Codex` and `noreply@openai.com`; Claude Code uses `Claude` and `noreply@anthropic.com`; GitHub Copilot CLI uses `GitHub Copilot CLI` and `223556219+Copilot@users.noreply.github.com`; Cursor uses `Cursor` and `cursoragent@cursor.com`; OpenCode uses `OpenCode` and `noreply@opencode.ai`; Pi uses `Pi` and `noreply@pi.dev`; other harnesses use their documented identity. Take the model's canonical display name from the active harness, write the context window in uppercase decimal `K` or `M` units (`272K`, `1M`), and use the literal value `unknown` for either field the harness does not expose rather than guessing. Preserve an automatically supplied trailer instead of adding a duplicate, and never add one to a human-authored commit.

## Accessing documentation

- `docs/` contains comprehensive documentation on the codebase. Start from [`docs/readme.md`](docs/readme.md), which indexes every subsystem doc.
- `grep` across `docs/**/*.md` when investigating, and keep querying it — especially when you meet something you do not understand. [`docs/glossary.md`](docs/glossary.md) defines the project's vocabulary; if a term is unfamiliar, resolve it there first.
- **Documentation is a two-way obligation: you read it, and you keep it true.** When a change makes something in `docs/` wrong, `docs-sync` will find and repair it — on its own if you invoke it, or as the first step of `end-session`. Landing the doc fix in the same commit as the change is what keeps the two from drifting apart.
- This matters more here than in most projects, because `docs/` is the fastest way into an unfamiliar subsystem — for you, for the next person, and for the next agent, which may plan a change against whatever it says. Docs describe how the project works **now**, not how it changed, so a doc your change outdated is better rewritten than annotated with what it used to say.

## Code standards

Read [`.github/instructions/code-standards.instructions.md`](.github/instructions/code-standards.instructions.md) before writing code, and [`.github/instructions/testing.instructions.md`](.github/instructions/testing.instructions.md) before writing tests. These describe the conventions the codebase follows. Read them even when an existing file already shows you a pattern to copy — the pattern may predate the convention, and a convention you have not read loses to one you can see.

Testing guidance lives in [`docs/testing.md`](docs/testing.md) — read it in full before writing tests.
