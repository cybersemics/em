# Layout Rendering Algorithm

Thoughts are not rendered as a nested DOM tree. Instead they are **a flat list of absolutely-positioned siblings** — every visible thought is a sibling `<div>` of every other visible thought, positioned via `transform: translate(x, y)`. The visual hierarchy is constructed by the x/y math, not by nesting.

This decoupling is what makes em's signature animation possible: a thought can move smoothly between any two states (different parent, different depth, different position in a context view) because no DOM hierarchy needs to be re-parented mid-animation. The same algorithm renders Normal view, Context view, and Table view.

The whole pipeline lives in [`src/components/LayoutTree.tsx`](../src/components/LayoutTree.tsx) and the hooks it composes.

## Two-pass render

Thoughts have variable heights — they wrap, they have notes, they are taller at cliffs. The browser is the only authority on their measured height. So rendering happens in two passes:

1. **Estimate pass.** The first render places every thought at a y position computed from `singleLineHeight` (an estimate based on `fontSize`, refined to the measured single-line height once any single-line thought has been rendered).
2. **Measurement pass.** Each [`VirtualThought`](../src/components/VirtualThought.tsx) measures its rendered height in a `useLayoutAnimationFrameEffect` and calls `onResize → setSize` with the actual value. [`useSizeTracking`](../src/hooks/useSizeTracking.ts) updates a `sizes` map.
3. **Reposition.** The state change in `sizes` triggers a re-render. [`usePositionedThoughts`](../src/hooks/usePositionedThoughts.ts) recomputes y positions using the measured heights. CSS transitions animate the y deltas into place smoothly.

The estimate is rarely far enough off to be visible, so the user almost never sees the intermediate position. The two-pass model is what lets the layout converge without snapping.

## Two lists, one ordering

Each render produces two parallel lists, both indexed by the same key:

- **`treeThoughts: TreeThought[]`** — produced by the [`linearizeTree`](../src/selectors/linearizeTree.ts) selector. An in-order traversal of all currently visible thoughts. Each entry carries depth, table-cell flags, autofocus state, the `Path` and `SimplePath`, accumulated styles, etc. Recalculated whenever Redux state changes.
- **`treeThoughtsPositioned: TreeThoughtPositioned[]`** — produced by `usePositionedThoughts`. Same shape but with `x`, `y`, `width`, `height`, `cliff`, `isLastVisible`. Recalculated when widths or heights change in the `sizes` map.

The render walks `treeThoughtsPositioned`, wrapping each entry in a `TreeNode` (which mounts a `VirtualThought` plus the appropriate drop targets) inside a `TransitionGroup` so removed thoughts can fade out.

## Keys: `crossContextualKey`

A thought can be visible in multiple places simultaneously when context views are active — e.g. *cat* under both `Animals/m~/cat` and `Pets/m~/cat`. The same `ThoughtId` must produce different React keys at each occurrence, otherwise React will reuse the DOM node and animations break.

`linearizeTree` builds keys via:

```ts
const crossContextualKey = (contextChain, id) =>
  `${(contextChain || []).map(head).join('')}|${id}`
```

So the key is the concatenation of every context-view boundary's `id` plus the thought's own `id`. The `sizes` map and TreeThought entries are both keyed this way.

## `linearizeTree` (the in-order traversal)

[`linearizeTree`](../src/selectors/linearizeTree.ts) recursively walks the visible tree. For each visit it produces a `TreeThought` with everything the second pass needs.

Important behaviors:

- **Visibility gating.** A subtree is skipped entirely unless `state.expanded[hashPath(path)]` is set, so collapsed branches don't appear in `treeThoughts` at all. (The expansion model itself lives in [`expandThoughts`](../src/selectors/expandThoughts.ts).)
- **Context-view pivot.** When a thought has its context view active, the recursion pivots from "render this thought's children" to "render the *contexts* in which this thought appears" via [`getContextsSortedAndRanked`](../src/selectors/getContextsSortedAndRanked.ts). The `contextChain` accumulator is updated, which feeds `crossContextualKey`. A special early-return: if the context view has only one context, the `NoOtherContexts` placeholder is rendered instead.
- **`belowCursor` propagation.** Once the cursor's `Path` is encountered during the walk, every subsequent `TreeThought` gets `belowCursor: true`. `LayoutTree` later uses this flag to exclude hidden-below-cursor thoughts from `totalHeight` so the document doesn't have a giant trailing dead zone.
- **Style inheritance.** `=children/=style` and `=grandchildren/=style` are merged into `styleAccum` (current level) and `styleFromGrandparent` (skips one level). Specific positioning properties (`marginLeft`, `paddingLeft`) accumulate down the tree so descendants stay aligned with their ancestors.
- **Table cell flags.** Each thought is tagged with `isTableCol1` / `isTableCol2` / `isTableCol2Child` based on `=view/Table` on its parent / grandparent / great-grandparent, plus `visibleChildrenKeys` is populated on table parents so col1 width can later be computed from the children's measured widths.

The result is a flat array, in document order, with one entry per visible thought.

## `usePositionedThoughts` (x and y)

[`usePositionedThoughts`](../src/hooks/usePositionedThoughts.ts) walks `treeThoughts` once and produces the positioned list. It runs in a `useMemo` keyed on the inputs (sizes, single-line height, viewport height, etc.).

Per thought:

```ts
const cliff = next ? Math.min(0, next.depth - node.depth) : -node.depth - 1
```

`cliff` is the number of levels dropped after this thought (negative). `cliff = 0` means the next thought is at the same depth or deeper; `cliff = -3` means the next thought is three levels shallower (the visible structure has fallen off a "cliff"). `cliff` drives both the cliff-padding (`cliffPadding = fontSize / 4` of extra height to make room for the trailing `DropCliff`) and how many `DropEnd`s to render between this thought and the next.

```ts
const height = sizes[node.key]?.height ?? singleLineHeight + (cliff < 0 ? cliffPadding : 0)
```

Use the measured height; fall back to the estimate.

```ts
const x = fontSize * node.depth + ancestorTableWidths
```

`x` indents by 1em per level of depth, plus any table-col1 widths *above* this thought (so col2 is offset to clear col1).

`y` is accumulated from a running `yaccum`, with three special cases:

- **Table col1**: do *not* increment `yaccum`, so col2 starts at the same y as col1. Push `{ depth, y: yaccum + height }` onto `ycol1Ancestors`. This stack remembers the bottom of each col1 thought so a sibling that follows a tall col1 can clear it.
- **Returning out of a col2**: if the top of `ycol1Ancestors` is at or above the current depth, pop it and bump `yaccum` to its bottom y if needed (so the next sibling clears col1, even when col2 was shorter).
- **New-cliff anticipation**: when a brand-new thought (`!sizes[node.key]`) appears at a cliff, the previous sibling is about to lose its cliff padding but hasn't been re-measured yet. Subtract `cliffPadding` from the new thought's y to anticipate the impending shift; otherwise the new thought renders at the wrong y for one frame and visibly slides up.

```ts
y = yaccum - (isNewCliff ? cliffPadding : 0)
yaccum += height (unless table col1)
```

After the loop:

- `tableCol1Widths: Map<ThoughtId, number>` — the widths of every table's col1, used as inputs to `ancestorTableWidths` further down the loop.
- `indentCursorAncestorTables` — captured when the cursor node is visited; drives the global horizontal autocrop (see [Indent](#indent-horizontal-autocrop)).
- `hoverArrowVisibility` — `'above' | 'below' | null`, set when the user is dragging into a sorted context and the drop position is outside the currently-rendered range. Drives the [`HoverArrow`](../src/components/HoverArrow.tsx) component.

## `useAutocrop` (vertical autocrop)

When the cursor is deep, many ancestors and ancestor-siblings are hidden by autofocus. Their hidden heights still occupy the document's y-coordinate space, leaving a tall blank region above the cursor. If you scroll up, the entire viewport is empty.

[`useAutocrop`](../src/components/LayoutTree.tsx) crops this empty space and counter-scrolls so the visible thoughts stay put under the user's finger:

1. `LayoutTree` sums the heights of every thought above the cursor where `sizes[key].isVisible === false && !belowCursor`. Result: `spaceAbove`.
2. `useAutocrop` extends that to at least one viewport height (so there's still room to scroll up): `spaceAboveExtended = max(spaceAbove, viewportHeight)`.
3. When `spaceAboveExtended` changes, `window.scrollTo({ top: window.scrollY - delta })` keeps visible thoughts positionally stable.
4. The hook returns `-spaceAboveExtended + viewportHeight`, applied as `transform: translateY(...)` on the outer container.

Net effect: the outer container is shifted up off-screen by exactly enough that one viewport's worth of empty space sits above the cursor. The user can scroll into that empty space; visible thoughts don't jump.

History: the original autocrop work is [issue #1751](https://github.com/cybersemics/em/issues/1751); the uncle-handling refinement is [issue #3055](https://github.com/cybersemics/em/issues/3055).

## Indent (horizontal autocrop)

The same idea applied horizontally. As the cursor descends, the entire tree slides left so the cursor stays roughly center-screen, and table-col1 widths are absorbed.

```ts
indent = indentDepth * 0.9 + indentCursorAncestorTables / fontSize
```

`indentDepth` is `cursor.length` minus 2 or 3 (depending on whether the cursor is on a leaf), so the indent only kicks in once the cursor has descended past the second level. The `0.9` multiplier is intentionally less than 1 — it under-shifts the tree by 10% per level so the user keeps a visual sense of depth. (Going to 1.0 makes deep navigation feel completely flat.)

`indentCursorAncestorTables` was captured during the position pass; it adjusts the indent based on whether the cursor is in col1 (extra 1em), col2 (offset by col1 width minus 3em), or a col2 child (offset by col1 width minus 4em).

The indent is applied as `transform: translateX(${1.5 - indent}em)` on the inner container with a slow CSS transition (`durations.layoutSlowShift`). A matching negative `marginRight` keeps thought widths from being clipped during the shift.

## Virtualization

`LayoutTree` virtualizes the bottom of the list. The virtualization boundary is:

```ts
viewportBottom = viewportBottomState (= scrollTop + innerHeight)
               + spaceAbove
               + (singleLineHeight * 5)   // overshoot, so a small scroll doesn't reveal blanks
```

Thoughts whose `y > viewportBottom` are still in `treeThoughtsPositioned` but rendered with `height: 0` if both `belowCursor` and `!isVisible`. (Above the cursor, the autocrop already takes care of the blank.)

## `useSizeTracking` and the `sizes` map

[`useSizeTracking`](../src/hooks/useSizeTracking.ts) keeps a state map of `{ height, width, isVisible, cliff }` keyed by `crossContextualKey`. `setSize` is the entry point — it's passed into every `VirtualThought` as `onResize`.

Two details:

- **Height clipping by `fontSize / 8`.** Each measured height is reduced by `fontSize / 8` before storage. Why: thoughts use a `clipPath` to avoid accidental caret-snap to the line above/below when a click lands on a 1px boundary. The clipPath leaves a gap; the small height reduction overlaps thoughts by exactly that gap, eliminating it visually.
- **Unmount cleanup.** When a `VirtualThought` unmounts, it calls `onResize` with `height: null`, and `useSizeTracking.removeSize` deletes the entry. An `unmounted` ref prevents racing setState after the parent has already gone.

`useSingleLineHeight` (in `LayoutTree.tsx`) finds the smallest measured height in `sizes` that's close to `fontSize * 2` and uses that as the canonical single-line height for unmeasured thoughts. Cached in a ref so it doesn't reset to the estimate when single-line thoughts scroll out of view.

## `VirtualThought` — when does it re-measure?

[`VirtualThought`](../src/components/VirtualThought.tsx) re-measures its height when:

- The thought first mounts.
- The `value` prop changes.
- The cursor moves (subscribed via `useSelectorEffect(updateSize, selectCursor, isEqual)`).
- The thought's style changes (subscribed via `useSelectorEffect`).
- The viewport's `innerWidth` changes.
- `autofocus`, `crossContextualKey`, `id`, or `isVisible` change.

`offsetHeight` is used on touch (avoids transform-induced fractional pixels); `getBoundingClientRect().height` on desktop.

## Render tree

```
div                                              (outer; translateY for autocrop)
  HoverArrow                                     (drop arrow when dragging into a sorted context off-screen)
  div                                            (inner; translateX for indent, slow CSS transition)
    BulletCursorOverlay                          (rendered separately so cursor moves don't re-render every thought)
    TransitionGroup
      for each thought in treeThoughtsPositioned
        TreeNode                                 (absolute positioning via inline style)
          VirtualThought                         (measures height, calls onResize)
          DropChild | DropEnd | DropCliff | DropUncle  (drag-only)
```

## Table view

Tables are rendered by the same algorithm; the differences live in three places:

1. **`linearizeTree` flags each thought.** `isTableCol1` if the parent has `=view/Table`; `isTableCol2` if the grandparent does; `isTableCol2Child` for one level deeper. `visibleChildrenKeys` is populated on the table parent so col1 widths can later be computed from measured children.
2. **`usePositionedThoughts` does the column placement.** As above: col1 doesn't advance `yaccum` (so col2 starts at the same y); `ycol1Ancestors` stack keeps track of col1's bottom y so the next row clears it. `tableCol1Widths` is built per-table and consulted by descendants for `ancestorTableWidths` (which feeds `x`).
3. **`indentCursorAncestorTables` provides the cursor-aware horizontal shift.** When the cursor is in col1, col2, or a col2 child, the global `indent` is adjusted so the user stays oriented: a tap into col2 shifts the tree left by col1's width minus 3em, so col1 stays visible but col2 moves toward center.

Worked example:

```
- a
  - =view
    - Table
  - b
    - b1
    - b2
  - c
    - d
      - e
```

`isTable`: a; `isTableCol1`: b, c; `isTableCol2`: b1, b2, d; `isTableCol2Child`: e.

When `b` is positioned, `yaccum` is *not* incremented; `b1` is placed at `(x = fontSize * 2 + b.width, y = b.y)`; `b2` at `(x = fontSize * 2 + b.width, y = b1.bottom)`. When the loop reaches `c`, `ycol1Ancestors.pop()` returns `b`'s `{ y: b.bottom, depth: b.depth }`; if `b.bottom > yaccum` (i.e. col1 was taller than col2), `yaccum` is bumped to `b.bottom` so `c` clears the previous row. `c` is then positioned at `(x = c.depth * fontSize, y = yaccum)`. Nested col2 rendering (e.g. `d/e`) accumulates col1 widths via `tableCol1Widths`, allowing arbitrarily nested tables.

## `useNavAndFooterHeight` and `spaceBelow`

[`useNavAndFooterHeight`](../src/components/LayoutTree.tsx) measures the toolbar/breadcrumb nav and footer heights via `getBoundingClientRect` (throttled to 16.66 ms). The container reserves `spaceBelow = viewportHeight - navAndFooterHeight - CONTENT_PADDING_BOTTOM (153px) - singleLineHeight` so that closing the virtual keyboard doesn't force a scroll-position change — the document still has at least one viewport's worth of slack at the bottom.

## `useLayoutTreeTop`

A small effect that writes the LayoutTree's top y (offset + autocrop) into `viewportStore.layoutTreeTop`. Used by `scrollCursorIntoView` to figure out where thoughts actually start on the page (vs. the toolbar above).
