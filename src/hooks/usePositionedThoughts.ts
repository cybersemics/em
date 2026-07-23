import { useLayoutEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import Index from '../@types/IndexType'
import ThoughtId from '../@types/ThoughtId'
import TreeThought from '../@types/TreeThought'
import TreeThoughtPositioned from '../@types/TreeThoughtPositioned'
import { CONTENT_BOX_PADDING_LEFT, HOME_TOKEN, LongPressState } from '../constants'
import testFlags from '../e2e/testFlags'
import scrollTopStore from '../stores/scrollTop'
import viewportStore from '../stores/viewport'
import head from '../util/head'
import parentOf from '../util/parentOf'
import useSortedContext from './useSortedContext'

/** Calculates the x,y position of each thought, from top to bottom. Initially renders each thought with y based on estimated height, then re-renders each thought after the actual heights are measured in the DOM. Returns a list of TreeThoughtPositioned, which extends TreeThought with x,y and width,height. */
const usePositionedThoughts = (
  treeThoughts: TreeThought[],
  {
    maxVisibleY,
    singleLineHeight,
    sizes,
  }: {
    maxVisibleY: number
    singleLineHeight: number
    sizes: Index<{ height: number; width?: number; isVisible: boolean; cliff?: number }>
  },
): {
  indentCursorAncestorTables: number
  treeThoughtsPositioned: TreeThoughtPositioned[]
  hoverArrowVisibility: 'above' | 'below' | null
} => {
  // Height of toolbar element
  const [toolbarHeight, setToolbarHeight] = useState(0)
  const dragInProgress = useSelector(state => state.longPress === LongPressState.DragInProgress)

  const fontSize = useSelector(state => state.fontSize)
  const cliffPadding = fontSize / 4

  // Available screen width, used to cap table col1 widths so that col1 and col2 share the available
  // horizontal space instead of a long col1 consuming it all and pushing col2 off the right edge.
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)

  // set the bullet width only during drag or when simulateDrop is true
  useLayoutEffect(() => {
    if (dragInProgress || testFlags.simulateDrop) {
      const toolbar = document.querySelector('#toolbar')
      if (toolbar) setToolbarHeight(toolbar.getBoundingClientRect().height)
    }
  }, [dragInProgress])

  const { isHoveringSorted, newRank } = useSortedContext()

  /** The value of scrollTop. Only enabled when there is a drag in progress for performance reasons. */
  const scrollTopIfDragging = scrollTopStore.useSelector(scrollTop => (dragInProgress ? scrollTop : null))

  // Accumulate the y position as we iterate the visible thoughts since the sizes may vary.
  // We need to do this in a second pass since we do not know the height of a thought until it is rendered, and since we need to linearize the tree to get the depth of the next node for calculating the cliff.
  const {
    indentCursorAncestorTables,
    treeThoughtsPositioned,
    hoverArrowVisibility,
  }: {
    // the global indent based on the depth of the cursor and how many ancestors are tables
    indentCursorAncestorTables: number
    treeThoughtsPositioned: TreeThoughtPositioned[]
    hoverArrowVisibility: 'above' | 'below' | null
  } = useMemo(() => {
    // y increases monotically, so it is more efficent to accumulate than to calculate each time
    // x varies, so we calculate it each time
    // (it is especially hard to determine how much x is decreased on cliffs when there are any number of tables in between)
    let yaccum = 0
    let indentCursorAncestorTables = 0

    // Arrow visibility based on the rank of drop target in sorted context.
    let hoverArrowVisibility: 'above' | 'below' | null = null

    // The rank of the first and last thoughts in sorted context.
    let firstThoughtRank = 0
    let lastThoughtRank = 0
    // The rank of the first and last visible thoughts in sorted context.
    let firstVisibleThoughtRank = 0
    let lastVisibleThoughtRank = 0

    /** A stack of { depth, y } that stores the bottom y value of each col1 ancestor. */
    /* By default, yaccum is not advanced by the height of col1. This is what positions col2 at the same y value as col1. However, if the height of col1 exceeds the height of col2, then the next node needs to be positioned below col1, otherwise it will overlap. This stack stores the minimum y value of the next node (i.e. y + height). Depth is used to detect the next node after all of col1's descendants.

    e.g. The height of Boston with its long note exceeds the height of b, c, and d combined. Therefore, the next node, x, needs to be positioned below Boston.

    - a
      - =view
        - Table
      - Boston
        - =note
          - What to do when the thought extends onto two or three lines or four lines if we keep going
        - b
          - c
            - d

    */
    const ycol1Ancestors: { depth: number; y: number }[] = []

    // cache table column 1 widths so they are only calculated once and then assigned to each thought in the column
    // key thoughtId of thought with =table attribute
    const tableCol1Widths = new Map<ThoughtId, number>()

    // The root context can also be a table (e.g. toggling Table View while the cursor is on a top-level thought sets =view/Table on the root).
    // Unlike other tables, the root is never rendered as a node in linearizeTree, so it never gets visibleChildrenKeys and its col1 width is never registered below.
    // Register it here, keyed by HOME_TOKEN, from the measured widths of the visible top-level col1 thoughts, so its col2 descendants can be shifted right (see ancestorTableWidths).
    const homeTableCol1Width = treeThoughts.reduce(
      (accum, node) => (node.depth === 0 && node.isTableCol1 ? Math.max(accum, sizes[node.key]?.width || 0) : accum),
      0,
    )
    if (homeTableCol1Width > 0) {
      // Cap the root table's col1 at roughly half the available horizontal band so col1 and col2 share the space and
      // wrap responsively, rather than a long col1 consuming the width and pushing col2 off the right edge.
      // The root's col1 thoughts sit at depth 0 with no ancestor tables, so col1X is effectively 0 here.
      const availableWidth = (innerWidth > 560 ? 0.9 : 1) * innerWidth - CONTENT_BOX_PADDING_LEFT
      const col1MaxWidth = Math.max(availableWidth / 2, fontSize)
      tableCol1Widths.set(HOME_TOKEN, Math.min(homeTableCol1Width, col1MaxWidth))
    }

    const treeThoughtsPositioned = treeThoughts.map((node, i) => {
      const prev = treeThoughts[i - 1] as TreeThought | undefined
      const prevCliff = prev ? sizes[prev.key]?.cliff : 0
      const next = treeThoughts[i + 1] as TreeThought | undefined

      // cliff is the number of levels that drop off after the last thought at a given depth. Increase in depth is ignored.
      // This is used to determine how many DropEnd to insert before the next thought (one for each level dropped).
      // TODO: Fix cliff across context view boundary
      const cliff = next ? Math.min(0, next.depth - node.depth) : -node.depth - 1

      // The single line height needs to be increased for thoughts that have a cliff below them.
      // For some reason this is not yielding an exact subpixel match, so the first updateHeight will not short circuit. Performance could be improved if th exact subpixel match could be determined. Still, this is better than not taking into account cliff padding.
      const singleLineHeightWithCliff = singleLineHeight + (cliff < 0 ? cliffPadding : 0)
      const height = sizes[node.key]?.height ?? singleLineHeightWithCliff

      // sum ancestor table widths
      // ignore thought and parent since horizontal shift should begin with col 2, and tableCol1Widths is keyed by the thought with =table
      // Prepend HOME_TOKEN so that a table on the root context (which is never rendered as a node and thus never appears in a Path) is treated as a virtual ancestor and still shifts its col2 descendants right.
      const pathWithHome = [HOME_TOKEN, ...node.path]
      const ancestorTableWidths = pathWithHome.reduce(
        (accum, id, i) => accum + (tableCol1Widths.get(pathWithHome[i - 2]) || 0),
        0,
      )

      // set the width of table col1 to the minimum width of all visible thoughts in the column
      if (node.visibleChildrenKeys) {
        const tableCol1Width = node.visibleChildrenKeys?.reduce(
          (accum, childKey) => Math.max(accum, sizes[childKey]?.width || 0),
          0,
        )
        if (tableCol1Width > 0) {
          // Cap col1 at roughly half the available horizontal band so col1 and col2 share the space and
          // wrap responsively, rather than a long col1 consuming the width and crushing col2 off the right edge.
          // x of the col1 thoughts (one level below this table thought). The col1 children inherit this thought's
          // ancestor table widths plus, when this thought is itself in a col2 (nested tables), its parent table's col1 width.
          const col1X =
            fontSize * (node.depth + 1) +
            ancestorTableWidths +
            (tableCol1Widths.get(head(parentOf(node.path)) ?? HOME_TOKEN) || 0)
          // The rightmost extent a thought may occupy, mirroring the maxWidth boundary in LayoutTree (90vw on wider screens, 100vw otherwise, minus the left content padding).
          const availableWidth = (innerWidth > 560 ? 0.9 : 1) * innerWidth - CONTENT_BOX_PADDING_LEFT
          // Never cap below 1em so col1 remains usable even on very narrow or deeply nested layouts.
          const col1MaxWidth = Math.max((availableWidth - col1X) / 2, fontSize)
          tableCol1Widths.set(head(node.path), Math.min(tableCol1Width, col1MaxWidth))
        }
      }

      // Calculate the cursor ancestor table width when we are on the cursor node.
      // This is used to animate the entire tree to the left as the cursor moves right.
      if (node.isCursor) {
        indentCursorAncestorTables =
          ancestorTableWidths +
          // table col1: shift left by an additional 1 em so that the shift at the next depth does not feel so extreme
          (node.isTableCol1
            ? fontSize
            : // table col2: shift right by the width of table col1 to offset ancestorTableWidths, since col1 is still visible
              // then shift left by 3 em, which is about the most we can do without col1 getting cropped by the left edge of the screen
              // fall back to HOME_TOKEN when the table is on the root context (its col1 is not present in the Path)
              node.isTableCol2
              ? -(tableCol1Widths.get(node.path[node.path.length - 3] ?? HOME_TOKEN) || 0) + fontSize * 3
              : // table col2 child: if the child is a leaf, shift right by the width of table col1 again since col1 is still visible
                // otherwise, shift by 3 em since col1 is now hidden, but we don't want too much of a jump
                node.isTableCol2Child && node.leaf
                ? -(tableCol1Widths.get(node.path[node.path.length - 4] ?? HOME_TOKEN) || 0) + fontSize * 4
                : 0)
      }

      const x =
        // indentation
        fontSize * node.depth +
        // table col2
        ancestorTableWidths

      // Set yaccum to the bottom of the previous row's col1 if it is higher than col2.
      // See: ycol1Ancestors
      if (ycol1Ancestors[ycol1Ancestors.length - 1]?.depth >= node.depth) {
        const ycol1 = ycol1Ancestors.pop()!
        if (ycol1.y > yaccum) {
          yaccum = ycol1.y
        }
      }

      /* 
        Anticipate cliff change on new thought

        There is a special case for the y position when creating a new thought at the end of a context. The former last thought (what will become the new thought's previous sibling) loses its cliff, e.g. cliff changes from -1 to 0. This causes it to lots its cliffPaddingStyle, and thus its height will decrease slightly. However, when the new thought is rendered, its y position is determined by the previous thought's cached height. The height is only re-measured after the nxet render. This causes the new thought's y position to decrease by the cliff padding over a single frame. It will appear to slide up as it animates into the correct y position (based on the updated previous sibling's measurement).

        Solution: Check if a new thought is being rendered at the cliff, and anticipate the updated y position by subtracting cliffPadding. This does not apply if the previous thought's depth is greater than the new thought's depth, as it will not be losing its cliff. It only applies if the prevous thought is a sibling or parent and is losing its cliff.

        (It may have been better to directly check if the previous thought is losing its cliff, however that would require persisting the last cliff for each thought in a ref. The additional state is less than ideal, but it can be pursued if it is discovered that this simple condition has any false positives/negatives.)

        e.g. `a` will lose its cliff but its height will not be re-measured until after [empty] has been rendered with the wrong y
          - a
          - [empty]
      */
      const isNewCliff =
        !sizes[node.key] && cliff < 0 && prev && node.depth >= prev.depth && (prevCliff === undefined || prevCliff < 0)

      // Capture the y position of the current thought before it is incremented by its own height for the next thought.
      const y = yaccum - (isNewCliff ? cliffPadding : 0)

      // In the normal case, increase yaccum by the height of the current thought so that the next thought is positioned below it.
      if (!node.isTableCol1) {
        yaccum += height
      }

      // If the current thought is in table col1, do not increment yaccum since col2 is positioned at the same y value as col1.
      // Push the col1 thought's y and depth onto the ycol1Ancestors stack so that its next sibling fully clears the height of the col1 thought in case col2 is shorter.
      // This is used to position the next thought below the col1 thought if it has a greater height than col2.
      // See: ycol1Ancestors
      if (node.isTableCol1) {
        ycol1Ancestors.push({ y: yaccum + height, depth: node.depth })
      }

      const isLastVisible =
        (node.autofocus === 'dim' || node.autofocus === 'show') &&
        !(next?.autofocus === 'dim' || next?.autofocus === 'show')

      if (scrollTopIfDragging !== null && node.isInSortedContext) {
        // Get first and last thought ranks in sorted context
        if (!firstThoughtRank) {
          firstThoughtRank = node.rank
        }
        lastThoughtRank = node.rank

        // Check if the current thought is visible
        if (y < maxVisibleY && y > scrollTopIfDragging - toolbarHeight) {
          // Get first and last visible thought ranks in sorted context
          if (!firstVisibleThoughtRank) {
            firstVisibleThoughtRank = node.rank
          }
          lastVisibleThoughtRank = node.rank
        }
      }

      return {
        ...node,
        cliff,
        height,
        singleLineHeightWithCliff,
        width: tableCol1Widths.get(head(parentOf(node.path)) ?? HOME_TOKEN),
        isLastVisible,
        x,
        y,
      }
    })

    // Determine hoverArrowVisibility based on newRank and the visible thoughts
    if (isHoveringSorted) {
      if (newRank > lastVisibleThoughtRank && lastVisibleThoughtRank !== lastThoughtRank) {
        hoverArrowVisibility = 'below'
      } else if (newRank < firstVisibleThoughtRank && firstVisibleThoughtRank !== firstThoughtRank) {
        hoverArrowVisibility = 'above'
      } else {
        hoverArrowVisibility = null
      }
    }

    return { indentCursorAncestorTables, treeThoughtsPositioned, hoverArrowVisibility }
  }, [
    cliffPadding,
    fontSize,
    innerWidth,
    isHoveringSorted,
    maxVisibleY,
    newRank,
    scrollTopIfDragging,
    singleLineHeight,
    sizes,
    toolbarHeight,
    treeThoughts,
  ])

  return {
    indentCursorAncestorTables,
    treeThoughtsPositioned,
    hoverArrowVisibility,
  }
}

export default usePositionedThoughts
