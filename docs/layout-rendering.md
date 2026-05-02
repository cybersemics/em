# Layout Rendering Algorithm

Rather than rely on the hierarchy of the DOM, thoughts are rendered as a flat list of siblings, and are absolutely positioned to create a visual hierarchy. This allows smooth animation of thoughts across levels between any arbitrary states.

The rendering algorithm is contained in the [LayoutTree](../src/components/LayoutTree.tsx) component.

Each rendering of the tree generates two lists of nodes:

1. `treeThoughts` - The `LayoutTree` does an in-order traversal of the thought tree from the Redux state, generating a linear sequence of all visible thoughts from top to bottom. Each `TreeThought` includes metadata such as depth, whether it has any children, if it's in a table view, etc, that are needed to render the thought. It is recalculated whenever the Redux state changes.
2. `treeThoughtsPositioned` - Next, the x,y coordinate are calculated for each visible thought. The accumulated y value is incremented by the height of each thought so that the next thought is rendered in the correct position. When the depth increases, the x value is increased (indent), and when the depth decreases, the x value is decreased (outdent). This list is recalculated whenever the width or height of a thought changes.

Thoughts are rendered in two passes:

- The **first render** positions all thoughts with an estimated height based on the current font size.
- Next, the [VirtualThought](../src/components/VirtualThought.tsx) component measures each thought's height in a layout effect and passes it up to the `LayoutTree` via `onResize`. If any of the heights differ from their original estimate, a re-render is triggered.
- The **second render** recalculates `treeThoughtsPositioned` with each thought's measured height. Any updates to thought y coordinates are smoothly animated into place via a CSS transition.

## LayoutTree Structure

`LayoutTree` orchestrates the two-pass layout via a small set of hooks and selectors:

- [`linearizeTree`](../src/selectors/linearizeTree.ts) - Redux selector that produces the flat `treeThoughts` list (in-order traversal with depth and table-view metadata).
- [`useSizeTracking`](../src/hooks/useSizeTracking.ts) - maintains the `sizes` map keyed by `crossContextualKey`, populated by each `VirtualThought` via `onResize`/`setSize`.
- `useSingleLineHeight` - derives an estimated single-line height (initially from `fontSize`, later from a measured single-line thought) used for unmeasured thoughts.
- [`usePositionedThoughts`](../src/hooks/usePositionedThoughts.ts) - second-pass hook that consumes `treeThoughts` and `sizes` and returns `treeThoughtsPositioned`, `indentCursorAncestorTables`, and `hoverArrowVisibility`.
- `useNavAndFooterHeight` - measures the nav and footer heights for `spaceBelow`.
- `useAutocrop` - crops the empty space above the cursor and counter-scrolls so thoughts appear stationary.

The render tree is roughly:

```
div - outer container (translateY for autocrop)
  HoverArrow
  div - inner container (translateX for indent, transitioned)
    BulletCursorOverlay (when cursor is positioned)
    TransitionGroup
      for each thought in treeThoughtsPositioned
        TreeNode
          VirtualThought (measures height -> setSize -> onResize)
          DropChild / DropUncle
```

## Table View

The table view is rendered within the same algorithm, with some differences to how the x,y coordinates are calculated.

Take the following table:

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

In the first step (`treeThoughts`), properties are added for each node that is part of a table.

e.g.
- `isTable`: a
- `isTableCol1`: b, c
- `isTableCol2`: b1, b2, d
- `isTableCol2Child`: e

In the second step (`treeThoughtsPositioned`), the x,y coordinates are generated for each thought.

- After col1 is rendered (e.g. `b`), the x coordinate is incremented by the thought's width, and the y coordinate is held at the same value, so that col2 is rendered to the right of col1 (e.g. `b1`).
- Additional thoughts in col2 (e.g. `b2`) are rendered one after another just like a normal list of thoughts.
- The next thought in col1 (e.g. `c`) is rendered at the x coordinate of its previous sibling and a y coordinate that clears the height of both columns in the previous row (e.g. `max(b, b1 + b2)`).

To support nested thoughts, the width of col1 thoughts are accumulated in `tableCol1Widths` so that deeper thoughts can be rendered at a deeper x coordinate. In combination with `ycol1Ancestors`, which stores the depth and y coordinate of col1 thoughts, this allows any level of nesting, including nested tables.

Lastly, the the entire tree is shifted left as the cursor moves deeper. Combined with the autofocus functionality which fades out ancestors the deeper the user moves, this allows the user to navigate throughout their thoughtspace while keeping the cursor and nearby thoughts front and center. The variables `indentDepth` and `indentCursorAncestorTables` are used to calculate how much the tree is shifted left.
