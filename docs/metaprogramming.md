# Metaprogramming

Metaprogramming provides the ability to alter **em**'s behavior from within **em** itself through hidden subthoughts called *metaprogramming attributes*. Metaprogramming attributes begin with `=` and are hidden unless `showHiddenThoughts` is toggled on from the toolbar. Generally an attribute will affect only its parent context.

**Note**: A handful of user settings (e.g. `experienceMode`, `leftHanded`, `hideSuperscripts`) are persisted as thoughts under the `EM` context at `/EM/Settings/`. See the `Settings` enum in `src/constants.ts` for the canonical list.

List of possible metaprogramming attributes:

- `=archive` Marks the thought (and its descendants) as archived; archived thoughts are hidden from normal views.
- `=attributes` Used under `=publish` to define attributes that should be applied when the context is published.
- `=bindContext` Binds the current context to another context so that edits propagate between them. Configured via the `bindContext` command, which stores the binding under `=bindContextCommand`.
- `=bullet` Hide the bullets of a context. Options: `None`. May also be applied via `=children/=bullet` or `=grandchildren/=bullet`.
- `=children` Apply attributes to all children. Currently works with `=style` and `=bullet`.
    e.g. This would make `b` and `c` the color `tomato`:
    ```
    - a
      - =children
        - =style
          - color
            - tomato
      - b
      - c
    ```
- `=done` Mark a thought as done; renders it grayed out and struck through.
- `=drop` Controls drag-and-drop behavior on the thought. Options: `top` (drop targets appear above the thought rather than below).
- `=favorite` Marks the thought as a favorite so it appears in the Favorites list.
- `=focus` When the cursor is on this thought, hide parent and siblings for additional focus. Options: `Normal`, `Zoom`.
- `=grandchildren` Apply attributes (e.g. `=style`, `=bullet`) to all grandchildren of the thought.
- `=immovable` The thought cannot be moved.
- `=label` Display alternative text, but continue using the real text when linking contexts. Hide the real text unless editing.
- `=let` Define named values under a context that can be referenced by descendant thoughts (lexical-scope-style variable bindings).
- `=note` Display a note in smaller text underneath the thought.
- `=options` Specify a list of allowable subthoughts.
- `=path` Under a `=note`, redirects the note's content to the thought at the given path rather than rendering literal note text.
- `=pin` Keep a thought expanded. Options: `true`, `false`. To pin all children of a context, use `=children/=pin/true`.
- `=preload` Marks a thought whose `=src` resources should be preloaded eagerly.
- `=publish` Holds publish-related metadata (byline, attributes, etc.) for a context that can be exported/published.
- `=readonly` The thought cannot be edited, moved, or extended.
- `=sort` Sort the subthoughts of a context. Options: `Alphabetical` (with `Asc` / `Desc` direction).
- `=src` Loads the contents of a remote resource (URL) as the subthoughts of the thought.
- `=style` Set CSS styles on the thought. May also use `=children/=style` or `=grandchildren/=style`.
- `=styleAnnotation` Set CSS styles on the thought's annotation (the superscript/secondary label) only.
- `=styleContainer` Set CSS styles on the thought's outer container element rather than its text.
- `=uneditable` The thought cannot be edited.
- `=unextendable` New subthoughts may not be added to the thought.
- `=view` Controls how the thought and its subthoughts are displayed. Options: `List`, `Table`, `Prose`.
