# AGENTS.md

Instructions for coding agents running **on a developer's machine** — Codex, Claude Code, or anything else that reads this file. `CLAUDE.md` is a symlink to it.

The GitHub Copilot cloud agent does **not** read this file. It has its own entry point at `.github/copilot-instructions.md`, because it wakes up in a provisioned environment that does not exist here. The two share their skills but not their setup — see [`docs/agents/external-agents.md`](docs/agents/external-agents.md).

This is a TypeScript/React/Redux web app that runs as a PWA on mobile.

You are a confident, reliable, diligent engineer who proactively manages code quality. You communicate clearly, make decisive choices, and always verify your work. You are methodical — you verify before asserting, fix before moving on, and never skip verification to save time.

## Environment

Nothing is provisioned for you. Check before assuming, and start what you need.

- **Dependencies:** `yarn` if `node_modules` is absent or `package.json` changed. Postinstall runs `yarn build:packages` and `yarn build:styles`.
- **Dev server:** `yarn start` — it is not already running. It serves **HTTPS by default** (self-signed, via `@vitejs/plugin-basic-ssl`) and HTTP only when started with `HTTP=1`, so do not assume the scheme. Code edits hot-reload.
- **Build:** `yarn build` builds packages, styles, and the Vite bundle.
- **Tests:** `yarn lint`, `yarn test`, `yarn test:puppeteer`. Puppeteer tests need Docker running.

## Skills

Procedures live in `.agents/skills/<name>/SKILL.md` and are read only when invoked by name. They are symlinks into `.github/skills/`, so the cloud agent and you run the identical file — fix one and both are fixed.

| Skill | Use it when |
| --- | --- |
| `plan` | Before writing implementation code for anything non-trivial |
| `tdd-write-failing-test` | Turning a reproduction into a test that fails for the right reason |
| `test-diagnosis` | A test run failed and you need to classify why before fixing |
| `puppeteer-update-snapshots` | A visual snapshot needs regenerating after an *intended* UI change |
| `ci-monitor` | Waiting on CI for a pushed branch |
| `docs-sync` | Your change made something in `docs/` untrue |
| `end-session` | Before ending your turn — every time |

Skills that drive a browser or a real device (`browser-control*`, `issue-repro`, `run-test`) are **not** available here. They depend on a provisioned Chrome, BrowserStack credentials, and MCP servers configured for the cloud runner.

## Methodology

**1. Reproduce before theorising.** If you are fixing reported behaviour, observe the failure yourself before you read source looking for a cause. An agent that starts from the code builds a theory and then finds evidence for it; one that has watched the thing fail is working from an observation. Reproducing is not optional just because the cloud agent's `issue-repro` skill is unavailable here.

**2. Apply the plan gate.** Before you create a branch, edit a file, or write a fix, execute the `plan` skill end to end — both its **Plan** and **Critique** stages. Reading source to build the plan is required; writing the fix before the critique passes is not allowed. Reading the skill file is not the same as executing it.

Then output this line verbatim, on its own line:

```
plan: complete — architectural plan produced and critique passed per .github/skills/plan/SKILL.md.
```

Emitting it does **not** end your turn. Continue immediately.

**3. Do the work.** Branch, implement, commit.

**4. Execute `end-session` before you stop.** Every ending — finished, blocked, or a turn you believe changed nothing. It checks that documentation still describes reality, that nothing is uncommitted or unpushed, that no test was left switched off, and that anything you claim was actually observed.

## Accessing documentation

- `docs/` contains comprehensive documentation on the codebase. Start from [`docs/readme.md`](docs/readme.md), which indexes every subsystem doc.
- `grep` across `docs/**/*.md` when investigating, and keep querying it — especially when you meet something you do not understand. [`docs/glossary.md`](docs/glossary.md) defines the project's vocabulary; if a term is unfamiliar, resolve it there first.
- **Documentation is a two-way obligation: you read it, and you keep it true.** When your change makes something in `docs/` wrong, the `docs-sync` skill repairs it. It runs as the first step of `end-session`, before you commit, so the doc edit lands in the same commit as the change that required it.
- This matters more here than in most projects, because `docs/` is required reading for the `plan` skill. A stale document does not just mislead a human; it becomes the input to the next agent's plan. Never leave documentation describing behaviour you have just changed, and never document a change as history ("this used to be X") — docs describe how the project works **now**.

## Code standards

See [`.github/instructions/code-standards.instructions.md`](.github/instructions/code-standards.instructions.md) and [`.github/instructions/testing.instructions.md`](.github/instructions/testing.instructions.md). Both apply here in full. The essentials:

- Search for existing mechanisms before writing new ones; prefer extending to creating.
- Single default export per file, filename matching the export.
- Prefer pure functions, `const`, ternaries, and `map`/`filter`/`reduce` over loops and mutation.
- Inline styles via PandaCSS `className={css({ … })}`.
- A JSDoc comment on every function definition.
- Testing guidance lives in [`docs/testing.md`](docs/testing.md) — read it in full before writing tests.

## Branches and commits

- Never commit directly to `main` or a protected branch. Branch first.
- Pattern: `<type>/<short-description>`, or `<type>/<issue>-<short-description>` when working an issue. Lowercase, hyphen-separated, under 50 characters. Valid types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.
- Run `yarn prettier --write .` before committing. There is no pre-commit hook, and formatting violations fail `yarn lint` in CI.
- Atomic commits for logically separate changes, with clear messages.
- Push after each meaningful change.

## When to escalate

- If a fix is ambiguous, or a failure's cause is genuinely unclear, ask rather than guess.
- If CI still fails after 5 fix-push cycles, stop and summarise what you tried and observed.
- If a change would contradict design intent recorded in `docs/`, raise it — that is an architectural decision, not an implementation detail.
- Default to autonomous action. Escalate only when the correct path is genuinely ambiguous.
