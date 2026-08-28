# Metaprogramming

Metaprogramming is **em**'s mechanism for changing app behavior from inside a thoughtspace, by adding hidden subthoughts whose values start with `=`. A thought like `=pin/true` under any context tells the app to keep that thought expanded; a thought like `=view/Table` tells it to render that subtree as a table; and so on.

Three things make this work:

1. Any thought value beginning with `=` is treated as a **meta-attribute** — hidden by default in normal view, and skipped during ordinary navigation.
2. The data structure stores meta-attribute children under their *value* in `childrenMap` (e.g. `childrenMap['=pin']`), giving the lookup a constant-time fast path. See [data-model.md](data-model.md).
3. The `attribute()` / `attributeEquals()` / `findDescendant()` selectors hide the lookup behind a small API.

Generally, an attribute affects *only its parent thought*. Three special attributes broadcast settings to descendants: `=children` and `=grandchildren` apply attributes one and two levels down, and `=descendants` applies recursively to the entire subtree (currently only `=pin`).

Meta-attribute children are hidden in normal view. Toggle the **Show Hidden Thoughts** command (`Option + Shift + H`) — which flips `state.showHiddenThoughts` — to view and edit them.

## How attributes are stored and read

`childrenMap` keys meta-attribute children by *value* rather than by `ThoughtId`. So a parent with three children `b`, `c`, and `=pin` looks like:

```ts
{
  childrenMap: {
    '<id of b>': '<id of b>',
    '<id of c>': '<id of c>',
    '=pin':       '<id of pin>',
  }
}
```

This shape lets attribute lookups skip the linear scan that regular value-based lookups need.

The four selectors most code uses:

- [`attribute(state, id, name)`](../src/selectors/attribute.ts) — returns the *value of the first visible child* of the named attribute, or `null`. So `attribute(state, parent.id, '=pin')` returns `'true'` (when set to `=pin/true`), `'false'`, or `null`. Use this when an attribute carries a string payload.
- [`attributeEquals(state, id, attr, value)`](../src/selectors/attributeEquals.ts) — `O(1)` boolean check. Use over `attribute` when you only need a yes/no, since this avoids reading the full child.
- [`findDescendant(state, id, values)`](../src/selectors/findDescendant.ts) — walks down a chain of values (e.g. `['=children', '=pin', 'true']`) and returns the deepest matching `ThoughtId`, or `null`. Uses the `childrenMap` shortcut at every meta-prefixed step. Use this for deeper checks, especially through `=children` / `=grandchildren` propagation.
- `findAnyChild(state, id, predicate)` — generic find on regular children. Used by some bespoke attribute lookups.

## Inheritance: `=children`, `=grandchildren`, and `=descendants`

Three attributes broadcast settings to descendants:

- `=children` applies its own attributes (e.g. `=style`, `=bullet`, `=pin`, `=note`) to **every direct child** of the parent.
- `=grandchildren` does the same, one level deeper.
- `=descendants` applies to **the entire subtree**, recursively. Currently only `=pin` is plumbed through (see [Pinning & expansion](#pinning--expansion)); the nearest ancestor that sets `=descendants/=pin` wins, and a closer-scoped `=children/=pin` or a thought's own `=pin` overrides it.

Example — make `b` and `c` colored tomato:

```
- a
  - =children
    - =style
      - color
        - tomato
  - b
  - c
```

The descendant attribute lookups consult these inheritance points in addition to direct children. For instance:

- [`useThoughtStyle`](../src/hooks/useThoughtStyle.ts) reads `=children/=style` from the parent and `=grandchildren/=style` from the grandparent.
- [`useHideBullet`](../src/hooks/useHideBullet.ts) reads `=bullet/None` directly, plus the `=children/=bullet`/`=grandchildren/=bullet` variants.
- The pinned-children behavior at `=children/=pin/true` is what replaced the old `=pinChildren` attribute.
- `=children` and `=grandchildren` thoughts are themselves filtered out of rendering — they never appear as siblings.

Not every attribute is propagable. Currently the `=children`/`=grandchildren` inheritance chain is plumbed through for `=style`, `=styleAnnotation`, `=styleContainer`, `=bullet`, and `=pin`; `=descendants` supports only `=pin`. Other attributes apply only to the direct parent.

## Attribute reference

### Display & layout

- **`=view`** — controls how the thought's subthoughts are laid out. Options: `List` (default), `Table`, `Prose`. Table view triggers the column-1/column-2 logic in [`linearizeTree`](../src/selectors/linearizeTree.ts) and [`usePositionedThoughts`](../src/hooks/usePositionedThoughts.ts).
- **`=sort`** — sort the subthoughts of a context. Options: `Alphabetical`, `Created`, `Updated`, `Note`, each with a sub-`Asc`/`Desc` direction. When unset, manual rank order is used. Read by [`getSortPreference`](../src/selectors/getSortPreference.ts).
- **`=style`** — CSS styles applied to the thought's text. The child of `=style` is the property name, and its child is the value: e.g. `=style/color/tomato`. Also accepts `=children/=style` and `=grandchildren/=style` for descendant propagation.
- **`=styleAnnotation`** — same shape as `=style`, but applied only to the thought's annotation (the dim superscript / count badge).
- **`=styleContainer`** — same shape as `=style`, but applied to the thought's outer container element rather than its text.
- **`=bullet`** — controls the bullet display. Options: `None` (hide the bullet); `Ordered` (render a 1-based ordinal number in place of the bullet, so children display as a numbered list); `Alpha` (render a 1-based letter — `a.`, `b.`, `c.`, … — so children display as a lettered list). Read by [`useHideBullet`](../src/hooks/useHideBullet.ts) and [`Bullet`](../src/components/Bullet.tsx). Replaces the old `=bullets` attribute. Also propagable via `=children/=bullet` / `=grandchildren/=bullet` — e.g. `=children/=bullet/Ordered` numbers every direct child. The bullet style of the current list can also be set from the toolbar via the **Bullet Style** picker ([`toggleBulletPicker`](../src/commands/toggleBulletPicker.ts)), which writes `=children/=bullet` on the cursor's parent.
- **`=focus`** — when the cursor lands on this thought, change how it and everything around it is rendered. Options: `Normal` (default), `Zoom`. Zoom gives the thought the full screen by hiding everything outside its subtree — its parent, its siblings, and their descendants. The zoom persists while the cursor is anywhere inside the zoomed thought, and the innermost zoom wins when zoomed thoughts are nested. The hiding is decided in [`calculateAutofocus`](../src/selectors/calculateAutofocus.ts), which returns `hide`/`hide-parent` for everything outside the zoom. Which thought is zoomed is resolved by [`zoomPath`](../src/selectors/zoomPath.ts), covering `=focus/Zoom` on the thought itself, `=children/=focus/Zoom` on its parent, and the `=let` form. `=focus/Zoom` also acts as a container for properties that apply only while the thought is the cursor: `=focus/Zoom/=style` ([`Subthought`](../src/components/Subthought.tsx)), `=focus/Zoom/=styleContainer` ([`useThoughtStyleContainer`](../src/hooks/useThoughtStyleContainer.ts)), and `=focus/Zoom/=bullet/None` ([`useHideBullet`](../src/hooks/useHideBullet.ts)). The `=let` forms of those three are resolved through [`findFirstEnvContextWithZoom`](../src/selectors/findFirstEnvContextWithZoom.ts).

### Pinning & expansion

- **`=pin`** — keep this thought expanded regardless of cursor position. Options: `true`, `false`. To pin every child of a context, use `=children/=pin/true` (this is the replacement for the now-removed `=pinChildren`). To pin the entire subtree open, use `=descendants/=pin/true` (the **Pin Descendants** command); it takes effect whenever the thought itself is expanded, and a descendant's own `=pin/false` or `=children/=pin/false` overrides it for that descendant. [`expandThoughts`](../src/selectors/expandThoughts.ts) and [`isPinned`](../src/selectors/isPinned.ts) consume it.

### Movement & editing constraints

- **`=immovable`** — the thought cannot be moved (drag-and-drop, indent/outdent, move-up/down). Drag rejection is handled in [`useDragAndDropThought.canDrag`](../src/hooks/useDragAndDropThought.tsx).
- **`=readonly`** — the thought cannot be edited *or* moved *or* extended. The strictest of the three constraints.
- **`=uneditable`** — the thought's text is fixed; existing children can still be moved or new ones added.
- **`=unextendable`** — new subthoughts cannot be added.

### Lifecycle

- **`=archive`** — marks the thought (and, semantically, its descendants) as archived. Archived thoughts are hidden from normal views but kept for recovery; the user surfaces them via the **Recently Deleted** UI. The `=archive` attribute is special-cased in many filters (e.g. it survives `isAttribute`-based hiding so the recently-deleted view can find it). See [`archiveThought`](../src/actions/archiveThought.ts) and [`isThoughtArchived`](../src/util/isThoughtArchived.ts).
- **`=done`** — marks a thought as completed. The thought is rendered grayed out and struck through. Consumed by [`Bullet`](../src/components/Bullet.tsx), [`Editable`](../src/components/Editable.tsx), and the **Mark as done** command.
- **`=favorite`** — marks the thought for inclusion in the Favorites panel. The Favorites Lexeme (`=favorite`) tracks every context that has this attribute.

### Linking & cross-references

- **`=bindContext`** — binds the current context to another so edits propagate between them. Created via the `bindContext` command, which stores the destination under a paired internal key `=bindContextCommand`.
- **`=label`** — display alternative text for the thought (the *label*) while continuing to use the thought's real value for any context lookups. The real value remains hidden unless the user is editing. Consumed by [`Editable`](../src/components/Editable.tsx) and [`ThoughtAnnotation`](../src/components/ThoughtAnnotation.tsx).
- **`=note`** — render a small note in lighter type underneath the thought. The first child of a literal `=note` is the note's text. See [`Note`](../src/components/Note.tsx).
- **`=path`** — used under a `=note` to redirect the note's content to another thought (looked up by path), instead of rendering the literal child of `=note`. The target's visible children are rendered in their configured sort order, separated by commas, and editing the note updates the corresponding children. See [`resolveNoteKey`](../src/selectors/resolveNoteKey.ts).
- **`=let`** — define lexically-scoped named values that descendants can reference. [`parseLet`](../src/util/parseLet.ts) reads a context's `=let` children, and [`linearizeTree`](../src/selectors/linearizeTree.ts) accumulates them down the tree into the `env` carried on every [`TreeThought`](../src/@types/TreeThought.ts), so a nearer `=let` overrides an outer one that binds the same name. A thought with a child that matches an env entry picks up that entry's `=style` ([`useThoughtStyle`](../src/hooks/useThoughtStyle.ts)), `=styleContainer` ([`useThoughtStyleContainer`](../src/hooks/useThoughtStyleContainer.ts)), `=bullet` ([`useHideBullet`](../src/hooks/useHideBullet.ts)), and `=focus/Zoom` (which zooms the thought via [`zoomPath`](../src/selectors/zoomPath.ts) as well as carrying the properties above). The definitions are never applied to `=let` itself nor to the bindings inside it.

### Publishing

- **`=publish`** — holds publish-related metadata (byline, attributes, etc.) for a context that is going to be exported or published. Consumed by [`Byline`](../src/components/Byline.tsx) and the publish flow in [`expandThoughts`](../src/selectors/expandThoughts.ts).
- **`=attributes`** — used as a child of `=publish` to specify attributes that should apply when the context is published.

### Drag-and-drop

- **`=drop`** — controls drag-and-drop behavior on the thought. Options: `top` (a thought dropped on this collapsed parent is inserted at the *top* of its children rather than the default bottom). Consumed by [`useDragAndDropSubThought`](../src/hooks/useDragAndDropSubThought.ts).

### Constraints & validation

- **`=options`** — specify a list of allowable child values. Used to constrain certain settings/configuration contexts. Consumed by [`Editable`](../src/components/Editable.tsx) and [`Thought`](../src/components/Thought.tsx).

### Inheritance

- **`=children`** — apply attributes to every direct child. See [Inheritance](#inheritance-children-grandchildren-and-descendants).
- **`=grandchildren`** — apply attributes to every grandchild.
- **`=descendants`** — apply attributes to the entire subtree, recursively. Currently only `=pin`.

## Defunct or test-only attributes

A few `=`-prefixed values appear in source but are not currently active user-facing attributes:

- **`=hidden`** — referenced by an old comment in [`getChildren.ts`](../src/selectors/getChildren.ts) but the gating call is commented out. The feature is dead; setting `=hidden` on a thought has no effect today.
- **`=hello`, `=dazzle`, `=test`, `=b`, `=c`, `=x`** — fixtures used in tests; they have no consumers in production code.
- **`=bindContextCommand`** — internal storage key used by the `bindContext` command, not authored by users.

## User settings

A handful of user settings are stored as thoughts under `[EM_TOKEN, 'Settings']` rather than in Redux state, so they sync between devices like normal thoughts.

The canonical list is the `Settings` enum in [`constants.ts`](../src/constants.ts):

```ts
enum Settings {
  experienceMode,
  hideScrollZone,
  leftHanded,
  favoritesHideContexts,
  hideSuperscripts,
}
```

(See the in-app **Settings** modal for human-readable descriptions of each.)

A separate set of *cached* settings — `CACHED_SETTINGS = ['Theme', 'Tutorial', 'Tutorial Step']` — is also persisted to `localStorage` by the [`pushQueue`](../src/redux-enhancers/pushQueue.ts) enhancer so they're available before Yjs hydrates on first paint. See [persistence.md](persistence.md) for the caching mechanics.

Reads go through [`getSetting`](../src/selectors/getSetting.ts), which first consults the in-memory thought (e.g. `[EM, 'Settings', 'Tutorial']`) and falls back to the localStorage cache when needed.
