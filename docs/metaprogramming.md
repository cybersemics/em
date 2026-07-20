# Metaprogramming

Metaprogramming is **em**'s mechanism for changing app behavior from inside a thoughtspace, by adding hidden subthoughts whose values start with `=`. A thought like `=pin/true` under any context tells the app to keep that thought expanded; a thought like `=view/Table` tells it to render that subtree as a table; and so on.

Three things make this work:

1. Any thought value beginning with `=` is treated as a **meta-attribute** — hidden by default in normal view, and skipped during ordinary navigation.
2. The data structure stores meta-attribute children under their *value* in `childrenMap` (e.g. `childrenMap['=pin']`), giving the lookup a constant-time fast path. See [data-model.md](data-model.md).
3. The `attribute()` / `attributeEquals()` / `findDescendant()` selectors hide the lookup behind a small API.

Generally, an attribute affects *only its parent thought*. Two special attributes — `=children` and `=grandchildren` — broadcast settings to descendants.

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

## Inheritance: `=children` and `=grandchildren`

Two attributes broadcast settings to descendants:

- `=children` applies its own attributes (e.g. `=style`, `=bullet`, `=pin`, `=note`) to **every direct child** of the parent.
- `=grandchildren` does the same, one level deeper.

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

Not every attribute is propagable. Currently the inheritance chain is plumbed through for `=style`, `=styleAnnotation`, `=styleContainer`, `=bullet`, and `=pin`. Other attributes apply only to the direct parent.

## Attribute reference

### Display & layout

- **`=view`** — controls how the thought's subthoughts are laid out. Options: `List` (default), `Table`, `Prose`. Table view triggers the column-1/column-2 logic in [`linearizeTree`](../src/selectors/linearizeTree.ts) and [`usePositionedThoughts`](../src/hooks/usePositionedThoughts.ts).
- **`=sort`** — sort the subthoughts of a context. Options: `Alphabetical`, `Created`, `Updated`, `Note`, each with a sub-`Asc`/`Desc` direction. When unset, manual rank order is used. Read by [`getSortPreference`](../src/selectors/getSortPreference.ts).
- **`=style`** — CSS styles applied to the thought's text. The child of `=style` is the property name, and its child is the value: e.g. `=style/color/tomato`. Also accepts `=children/=style` and `=grandchildren/=style` for descendant propagation.
- **`=styleAnnotation`** — same shape as `=style`, but applied only to the thought's annotation (the dim superscript / count badge).
- **`=styleContainer`** — same shape as `=style`, but applied to the thought's outer container element rather than its text.
- **`=bullet`** — controls the bullet display. Options: `None` (hide the bullet); `Ordered` (render a 1-based ordinal number in place of the bullet, so children display as a numbered list); `Alpha` (render a 1-based letter — `a.`, `b.`, `c.`, … — so children display as a lettered list). Read by [`useHideBullet`](../src/hooks/useHideBullet.ts) and [`Bullet`](../src/components/Bullet.tsx). Replaces the old `=bullets` attribute. Also propagable via `=children/=bullet` / `=grandchildren/=bullet` — e.g. `=children/=bullet/Ordered` numbers every direct child. The bullet style of the current list can also be set from the toolbar via the **Bullet Style** picker ([`toggleBulletPicker`](../src/commands/toggleBulletPicker.ts)), which writes `=children/=bullet` on the cursor's parent.
- **`=focus`** — when the cursor lands on this thought, change how ancestors and siblings are rendered. Options: `Normal` (default), `Zoom`. Zoom mode hides parent and siblings to give the active thought the full screen — handled by [`useZoom`](../src/hooks/useZoom.ts) and [`findFirstEnvContextWithZoom`](../src/selectors/findFirstEnvContextWithZoom.ts).

### Pinning & expansion

- **`=pin`** — keep this thought expanded regardless of cursor position. Options: `true`, `false`. To pin every child of a context, use `=children/=pin/true` (this is the replacement for the now-removed `=pinChildren`). [`expandThoughts`](../src/selectors/expandThoughts.ts) and [`isPinned`](../src/selectors/isPinned.ts) consume it.

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
- **`=note`** — render a small note in lighter type underneath the thought. The first child of `=note` is the note's text. See [`Note`](../src/components/Note.tsx).
- **`=path`** — used under a `=note` to redirect the note's content to another thought (looked up by path), instead of rendering the literal child of `=note`. See [`resolveNoteKey`](../src/selectors/resolveNoteKey.ts).
- **`=let`** — define lexically-scoped named values that descendants can reference. Parsed by [`parseLet`](../src/util/parseLet.ts) and consumed by [`useThoughtStyle`](../src/hooks/useThoughtStyle.ts) (so a `=let` binding for a color name resolves when used in `=style`).

### Content sources

- **`=src`** — load the contents of a remote URL (or local file) as the subthoughts of this thought. The first child of `=src` is the URL. Consumed by [`loadResource`](../src/actions/loadResource.ts).
- **`=preload`** — when set, `=src` content is preloaded eagerly on app start instead of waiting until the thought is opened. Consumed by [`preloadSources`](../src/actions/preloadSources.ts).

### Publishing

- **`=publish`** — holds publish-related metadata (byline, attributes, etc.) for a context that is going to be exported or published. Consumed by [`Byline`](../src/components/Byline.tsx) and the publish flow in [`expandThoughts`](../src/selectors/expandThoughts.ts).
- **`=attributes`** — used as a child of `=publish` to specify attributes that should apply when the context is published.

### Drag-and-drop

- **`=drop`** — controls drag-and-drop behavior on the thought. Options: `top` (a thought dropped on this collapsed parent is inserted at the *top* of its children rather than the default bottom). Consumed by [`useDragAndDropSubThought`](../src/hooks/useDragAndDropSubThought.ts).

### Constraints & validation

- **`=options`** — specify a list of allowable child values. Used to constrain certain settings/configuration contexts. Consumed by [`Editable`](../src/components/Editable.tsx) and [`Thought`](../src/components/Thought.tsx).

### Inheritance

- **`=children`** — apply attributes to every direct child. See [Inheritance](#inheritance-children-and-grandchildren).
- **`=grandchildren`** — apply attributes to every grandchild.

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
  disableGestureTracing,
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
