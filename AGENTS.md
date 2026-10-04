# AGENTS.md

**em** is a TypeScript/React/Redux web app that runs as a PWA or through Capacitor on mobile, and as a PWA or through Tauri on desktop.

## Working in this repo

**1. Reproduce before theorising.** If you are fixing reported behaviour, try observing the failure yourself before making assumptions. An agent that starts from the code builds a theory and then finds evidence for it; one that has watched the thing fail is working from an observation. When the report carries a Debug Log, `compare-debug-log` holds it against one captured while you drive the same steps and tells you where the two runs parted — worth running even when the failure will not reproduce, since a named divergence is a better answer than none.

**2. Use `write-issue` when you file one.** Issues reporting broken behaviour here follow a fixed format — "Steps to Reproduce", "Current Behavior", "Expected Behavior". The skill has the template and the conventions around it; run it whenever you create an issue, split one out of a comment thread, or add steps to one that lacks them.

**3. Suggest `end-session` when the work is wrapping up.** As the user starts to finish — pushing, opening a pull request, handing the change on — offer executing `end-session` to the user. It checks that documentation still describes reality, that nothing is uncommitted or unpushed, that no test was left switched off, and that anything claimed was actually observed.

**4. Attribute every agent-authored commit to its harness, model, and reasoning level.** End the message with one trailer such as `Co-Authored-By: Claude claude-opus-5-5 (medium) <noreply@anthropic.com>`, in the form `{Harness} {model-id} ({reasoning-level}) <{harness's GitHub noreply email}>`. Write `unknown` for anything the harness does not tell you rather than guessing, and never add a trailer to a commit a person wrote.

The repo's `commit-msg` hook adds this automatically for Claude Code, Codex, OpenCode, Cursor, and Pi, replacing any trailer the harness wrote itself. Any other harness must add it by hand — GitHub Copilot CLI, for example, uses `GitHub Copilot CLI` and `223556219+Copilot@users.noreply.github.com`. [External agents](docs/agents/external-agents.md) explains how the hook works.

**5. Leave commit hashes bare on GitHub.** In issues, comments, and pull request descriptions, write a commit hash as plain text — no backticks and no code block. GitHub autolinks a bare hash to the commit; wrapping it in code formatting suppresses the link.

## Accessing documentation

- `docs/` contains comprehensive documentation on the codebase. Start from [`docs/readme.md`](docs/readme.md), which indexes every subsystem doc.
- `grep` across `docs/**/*.md` when investigating, and keep querying it — especially when you meet something you do not understand. [`docs/glossary.md`](docs/glossary.md) defines the project's vocabulary; if a term is unfamiliar, resolve it there first.
- **Documentation is a two-way obligation: you read it, and you keep it true.** When a change makes something in `docs/` wrong, `docs-sync` will find and repair it — on its own if you invoke it, or as the first step of `end-session`. Landing the doc fix in the same commit as the change is what keeps the two from drifting apart.
- This matters more here than in most projects, because `docs/` is the fastest way into an unfamiliar subsystem — for you, for the next person, and for the next agent, which may plan a change against whatever it says. Docs describe how the project works **now**, not how it changed, so a doc your change outdated is better rewritten than annotated with what it used to say.

## Code standards

Read [`.github/instructions/code-standards.instructions.md`](.github/instructions/code-standards.instructions.md) before writing code, and [`.github/instructions/testing.instructions.md`](.github/instructions/testing.instructions.md) before writing tests. These describe the conventions the codebase follows. Read them even when an existing file already shows you a pattern to copy — the pattern may predate the convention, and a convention you have not read loses to one you can see.

Testing guidance lives in [`docs/testing.md`](docs/testing.md) — read it in full before writing tests.
