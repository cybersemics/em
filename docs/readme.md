# em Documentation

The in-repo documentation for **em**. The GitHub wiki is being deprecated in favour of these files; everything lives alongside the code now.

> **Note:** These docs were imported from the wiki and have not yet been refreshed against the current codebase. Some sections (especially [Persistence](persistence.md) and [Drag and Drop](drag-and-drop.md)) are known to be stale. A staleness audit lives in the conversation history; updates will land in follow-up commits.

## Architecture

- [Folder Structure](folder-structure.md) — Top-level layout of `src/`.
- [Data Model](data-model.md) — Thoughts, contexts, paths, lexemes, and views.
- [Persistence](persistence.md) — How thoughts are stored and synced.
- [Metaprogramming](metaprogramming.md) — Hidden `=` attributes that change app behaviour.
- [Cursor and Caret](cursor-and-caret.md) — The cursor (active thought) vs. the browser selection (caret).
- [Drag and Drop](drag-and-drop.md) — react-dnd integration and drop targets.
- [Layout Rendering](layout-rendering.md) — How thoughts are positioned in the absolute-flat-list layout.

## Reference

- [Commands](commands.md) — All user-facing commands and keyboard shortcuts.
- [Testing](testing.md) — Testing approach, platforms, and frameworks.
- [Autohide](autohide.md) — Autohide behaviour.
