# em Documentation

The in-repo documentation for **em**. The GitHub wiki is being deprecated in favour of these files; everything lives alongside the code now.

## Architecture

- [Folder Structure](folder-structure.md) — Top-level layout of `src/`.
- [Data Model](data-model.md) — Thoughts, contexts, paths, lexemes, and views.
- [Persistence](persistence.md) — How thoughts are stored and synced.
- [Metaprogramming](metaprogramming.md) — Hidden `=` attributes that change app behaviour.
- [Cursor and Caret](cursor-and-caret.md) — The cursor (active thought) vs. the browser selection (caret).
- [Drag and Drop](drag-and-drop.md) — react-dnd integration and drop targets.
- [Layout Rendering](layout-rendering.md) — How thoughts are positioned in the absolute-flat-list layout, including the autocrop / vertical-autocrop mechanism.

## Agents

- [Agent Infrastructure](agents/readme.md) — How the GitHub Copilot coding agent works on this repo: what it reads, and how a task flows through it.
- [Skills](agents/skills.md) — The skills under `.github/skills/`, what each does, and how they call each other.
- [Agent Environment](agents/environment.md) — What the runner provisions, how the agent drives a browser, and how iOS runs on a real device.
- [MCP Servers](agents/mcp.md) — The external tool servers the agent calls, how they are configured (outside this repo), and what breaks when they are not.
- [The TDD Workflow](agents/tdd.md) — Why regression tests are committed switched off, and why a red TDD check and a red test suite mean opposite things.
- [External Agents](agents/external-agents.md) — How Codex and Claude Code share this suite through `AGENTS.md` and symlinked skills, and which skills stay cloud-only.

## Reference

- [Glossary](glossary.md) — Project-specific terms (cliff, autofocus, lexeme, tangential context, tsid, …) with cross-links to the deeper docs. Start here if you encounter unfamiliar vocabulary.
- [Commands](commands.md) — All user-facing commands and keyboard shortcuts, plus the architecture of the command system.
- [Testing](testing.md) — Testing approach, platforms, and frameworks.
