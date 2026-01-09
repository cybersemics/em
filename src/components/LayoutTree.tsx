import { isEqual, throttle } from 'lodash'
import { RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css, cx } from '../../styled-system/css'
import Index from '../@types/IndexType'
import ThoughtId from '../@types/ThoughtId'
import { isTouch } from '../browser'
import { LongPressState } from '../constants'
import testFlags from '../e2e/testFlags'
import usePositionedThoughts from '../hooks/usePositionedThoughts'
import useSizeTracking from '../hooks/useSizeTracking'
import fauxCaretTreeProvider from '../recipes/fauxCaretTreeProvider'
import { hasChildren } from '../selectors/getChildren'
import linearizeTree from '../selectors/linearizeTree'
import nextSibling from '../selectors/nextSibling'
import reactMinistore from '../stores/react-ministore'
import scrollTopStore from '../stores/scrollTop'
import viewportStore from '../stores/viewport'
import head from '../util/head'
import parentOf from '../util/parentOf'
import BulletCursorOverlay from './BulletCursorOverlay'
import HoverArrow from './HoverArrow'
import TreeNode from './TreeNode'

/** The padding-bottom of the .content element. Make sure it matches the CSS. */
const CONTENT_PADDING_BOTTOM = 153

/** A computed store that tracks the bottom of the viewport. Used for list virtualization. Does not include overscroll, i.e. if the user scrolls past the top of the document viewportBottom will not change. */
const viewportBottomStore = reactMinistore.compose(
  (viewport, scrollTop) => Math.max(scrollTop, 0) + viewport.innerHeight,
  [viewportStore, scrollTopStore],
)

/** Calculates the height of a single-line thought. Initially uses an estimated height, then uses the height measured from thn DOM. */
const useSingleLineHeight = (sizes: Index<{ height: number; width?: number; isVisible: boolean }>) => {
  const fontSize = useSelector(state => state.fontSize)
  // singleLineHeight is the measured height of a single line thought.
  // If no sizes have been measured yet, use the estimated height.
  // Cache the last measured value in a ref in case sizes no longer contains any single line thoughts.
  // Then do not update it again.
  const singleLineHeightPrev = useRef<number | null>(null)
  const singleLineHeight = useMemo(() => {
    // The estimatedHeight calculation is ostensibly related to the font size, line height, and padding, though the process of determination was guess-and-check. This formula appears to work across font sizes.
    // If estimatedHeight is off, then totalHeight will fluctuate as actual sizes are saved (due to estimatedHeight differing from the actual single-line height).
    const estimatedHeight = fontSize * 2

    const singleLineHeightMeasured = Object.values(sizes).find(
      // TODO: This does not differentiate between leaves, non-leaves, cliff thoughts, which all have different sizes.
      ({ height }) => Math.abs(height - estimatedHeight) < height / 2,
    )?.height
    if (singleLineHeightMeasured) {
      singleLineHeightPrev.current = singleLineHeightMeasured
    }
    return singleLineHeightPrev.current || estimatedHeight
  }, [fontSize, sizes])

  return singleLineHeight
}

/** Measure the total height of the .nav and .footer elements on render. Always triggers a second render (which is nonconsequential since useSizeTracking already entails additional renders as heights are rendered). */
const useNavAndFooterHeight = () => {
  // Get the nav and footer heights for the spaceBelow calculation.
  // Nav hight changes when the breadcrumbs wrap onto multiple lines.
  // Footer height changes on font size change.
  const [navbarHeight, setNavbarHeight] = useState(0)
  const [footerHeight, setFooterHeight] = useState(0)

  // Read the footer and nav heights on render and set the refs so that the spaceBelow calculation is updated on the next render.
  // This works because there is always a second render due to useSizeTracking.
  // No risk of infinite render since the effect cannot change the height of the nav or footer.
  // nav/footer height -> effect -> setNavbarHeight/setFooterHeight -> render -> effect -> setNavbarHeight/setFooterHeight (same values)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(
    throttle(() => {
      const navEl = document.querySelector('[aria-label="nav"]')
      const footerEl = document.querySelector('[aria-label="footer"]')
      setNavbarHeight(navEl?.getBoundingClientRect().height || 0)
      setFooterHeight(footerEl?.getBoundingClientRect().height || 0)
    }, 16.666),
  )

  return {
    navbarHeight,
    footerHeight,
  }
}

/** When navigating deep within the hierarchy, many ancestors and siblings of ancestors are hidden, resulting in a large blank space above the cursor. If the user scrolls up, the entire screen will be blank. To avoid this, crop the space above and simultaneously scroll up by the same amount so that the thoughts do not appear to move (relative to the viewport), but the empty space above is eliminated. Returns the number of pixels that all thoughts should be shifted off. */
const useAutocrop = (spaceAbove: number): number => {
  // get the scroll position before the render so it can be preserved
  const scrollY = window.scrollY

  const viewportHeight = viewportStore.useSelector(viewport => viewport.innerHeight)

  // extend spaceAbove to be at least the height of the viewport so that there is room to scroll up
  const spaceAboveExtended = Math.max(spaceAbove, viewportHeight)

  const spaceAboveLast = useRef(spaceAboveExtended)

  // when spaceAbove changes, scroll by the same amount so that the thoughts appear to stay in the same place
  useEffect(
    () => {
      const spaceAboveDelta = spaceAboveExtended - spaceAboveLast.current
      window.scrollTo({ top: scrollY - spaceAboveDelta })
      spaceAboveLast.current = spaceAboveExtended
    },
    // do not trigger effect on scrollY change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spaceAboveExtended],
  )

  // add a full viewport height's space above to ensure that there is room to scroll by the same amount as spaceAbove
  return -spaceAboveExtended + viewportHeight
}

/** A hook that returns a ref to the content div and updates the viewport store's layoutTreeTop property on mount. */
const useLayoutTreeTop = (
  ref: RefObject<HTMLElement | null>,
  /** The amount that the layout tree is shifted up is needed to produce the correct layoutTreeTop value. See: useAutocrop. */
  autocrop: number,
) => {
  useEffect(() => {
    if (!ref.current) return
    viewportStore.update({ layoutTreeTop: (ref.current?.offsetTop || 0) + autocrop })
  }, [ref, autocrop])

  return ref
}

/** Lays out thoughts as DOM siblings with manual x,y positioning. */
const LayoutTree = () => {
  const editing = useSelector(state => state.isKeyboardOpen)
  const { sizes, setSize } = useSizeTracking()
  const treeThoughts = useSelector(linearizeTree, isEqual)
  const fontSize = useSelector(state => state.fontSize)
  const dragInProgress = useSelector(state => state.longPress === LongPressState.DragInProgress)
  const ref = useRef<HTMLDivElement>(null)
  const indentDepth = useSelector(state =>
    state.cursor && state.cursor.length > 2
      ? // when the cursor is on a leaf, the indention level should not change
        state.cursor.length - (hasChildren(state, head(state.cursor)) ? 2 : 3)
      : 0,
  )

  // Width of thought bullet
  const [bulletWidth, setBulletWidth] = useState(0)
  // Distance from toolbar to the first visible thought
  const [layoutTop, setLayoutTop] = useState(0)

  // set the bullet width only during drag or when simulateDrop is true
  useLayoutEffect(() => {
    if (dragInProgress || testFlags.simulateDrop) {
      const bullet = ref.current?.querySelector('[aria-label=bullet]')
      if (bullet) setBulletWidth(bullet?.getBoundingClientRect().width)

      setLayoutTop(ref.current?.getBoundingClientRect().top ?? 0)
    }
  }, [dragInProgress, ref])

  const singleLineHeight = useSingleLineHeight(sizes)

  // cursor depth, taking into account that a leaf cursor has the same autofocus depth as its parent
  const autofocusDepth = useSelector(state => {
    // only set during drag-and-drop to avoid re-renders
    if (
      (state.longPress !== LongPressState.DragInProgress && !testFlags.simulateDrag && !testFlags.simulateDrop) ||
      !state.cursor
    )
      return 0
    const isCursorLeaf = !hasChildren(state, head(state.cursor))
    return state.cursor.length + (isCursorLeaf ? -1 : 0)
  })

  // first uncle of the cursor used for DropUncle
  const cursorUncleId = useSelector(state => {
    // only set during drag-and-drop to avoid re-renders
    if (
      (state.longPress !== LongPressState.DragInProgress && !testFlags.simulateDrag && !testFlags.simulateDrop) ||
      !state.cursor
    )
      return null
    const isCursorLeaf = !hasChildren(state, head(state.cursor))
    const cursorParentId = state.cursor[state.cursor.length - (isCursorLeaf ? 3 : 2)] as ThoughtId | null
    return (cursorParentId && nextSibling(state, cursorParentId)?.id) || null
  })

  const viewportHeight = viewportStore.useSelector(viewport => viewport.innerHeight)

  const {
    // the total amount of space above the first visible thought that will be cropped
    spaceAbove,

    // Sum all the sizes to get the total height of the containing div.
    // Use estimated single-line height for the thoughts that do not have sizes yet.
    // Exclude hidden thoughts below the cursor to reduce empty scroll space.
    totalHeight,
  } = treeThoughts.reduce(
    (accum, node) => {
      const heightNext =
        node.key in sizes
          ? sizes[node.key].isVisible || !node.belowCursor
            ? sizes[node.key].height
            : 0
          : singleLineHeight
      return {
        totalHeight: accum.totalHeight + heightNext,
        spaceAbove:
          accum.spaceAbove + (sizes[node.key] && !sizes[node.key].isVisible && !node.belowCursor ? heightNext : 0),
      }
    },
    {
      totalHeight: 0,
      spaceAbove: 0,
    },
  )

  // The bottom of all visible thoughts in a virtualized list where thoughts below the viewport are hidden (relative to document coordinates; changes with scroll position).
  const viewportBottom = viewportBottomStore.useSelector(
    useCallback(
      viewportBottomState => {
        // the number of additional thoughts below the bottom of the screen that are rendered
        const overshoot = singleLineHeight * 5
        return viewportBottomState + spaceAbove + overshoot
      },
      [singleLineHeight, spaceAbove],
    ),
  )

  const { footerHeight, navbarHeight } = useNavAndFooterHeight()
  const navAndFooterHeight = navbarHeight + footerHeight

  // memoize the cliff padding style to avoid passing a fresh object reference as prop to TreeNode and forcing a re-render
  const cliffPadding = fontSize / 4
  const cliffPaddingStyle = useMemo(() => ({ paddingBottom: cliffPadding }), [cliffPadding])

  const { indentCursorAncestorTables, treeThoughtsPositioned, hoverArrowVisibility } = usePositionedThoughts(
    treeThoughts,
    {
      maxVisibleY: viewportHeight - (layoutTop + navbarHeight),
      singleLineHeight,
      sizes,
    },
  )

  // compare between state.cursor and the position of the thought
  const cursorThoughtPositionedIndex = treeThoughtsPositioned.findIndex(thought => thought.isCursor)
  const cursorThoughtPositioned = treeThoughtsPositioned[cursorThoughtPositionedIndex]

  // The indentDepth multipicand (0.9) causes the horizontal counter-indentation to fall short of the actual indentation, causing a progressive shifting right as the user navigates deeper. This provides an additional cue for the user's depth, which is helpful when autofocus obscures the actual depth, but it must stay small otherwise the thought width becomes too small.
  // The indentCursorAncestorTables multipicand (0.5) is smaller, since animating over by the entire width of column 1 is too abrupt.
  // (The same multiplicand is applied to the vertical translation that crops hidden thoughts above the cursor.)
  const indent = indentDepth * 0.9 + indentCursorAncestorTables / fontSize

  const autocrop = useAutocrop(spaceAbove)

  /** The space added below the last rendered thought and the breadcrumbs/footer. This is calculated such that there is a total of one viewport of height between the last rendered thought and the bottom of the document. This ensures that when the keyboard is closed, the scroll position will not change. If the caret is on a thought at the top edge of the screen when the keyboard is closed, then the document will shrink by the height of the virtual keyboard. The scroll position will only be forced to change if the document height is less than window.scrollY + window.innerHeight. */
  // Subtract singleLineHeight since we can assume that the last rendered thought is within the viewport. (It would be more accurate to use its exact rendered height, but it just means that there may be slightly more space at the bottom, which is not a problem. The scroll position is only forced to change when there is not enough space.)
  const spaceBelow = viewportHeight - navAndFooterHeight - CONTENT_PADDING_BOTTOM - singleLineHeight

  useLayoutTreeTop(ref, autocrop)

  return (
    <div
      className={cx(
        css({
          marginTop: '0.501rem',
        }),
        fauxCaretTreeProvider(indent),
      )}
      style={{ transform: `translateY(${autocrop}px)` }}
      ref={ref}
    >
      <HoverArrow
        // Calculate the position of the arrow relative to the bottom of the container.
        bottom={totalHeight + spaceBelow - viewportHeight + navAndFooterHeight}
        hoverArrowVisibility={hoverArrowVisibility}
      />
      <div
        className={css({ transition: `transform {durations.layoutSlowShift} ease-out` })}
        style={{
          // Set a container height that fits all thoughts.
          // Otherwise scrolling down quickly will bottom out as virtualized thoughts are re-rendered and the document height is built back up.
          height: totalHeight + spaceBelow,
          // Use translateX instead of marginLeft to prevent multiline thoughts from continuously recalculating layout as their width changes during the transition.
          // Instead of using spaceAbove, we use -min(spaceAbove, c) + c, where c is the number of pixels of hidden thoughts above the cursor before cropping kicks in.
          transform: `translateX(${1.5 - indent}em`,
          // Add a negative marginRight equal to translateX to ensure the thought takes up the full width. Not animated for a more stable visual experience.
          marginRight: `${-indent + (isTouch ? 2 : -1)}em`,
        }}
      >
        {cursorThoughtPositioned && (
          <BulletCursorOverlay
            isTableCol1={cursorThoughtPositioned.isTableCol1}
            path={cursorThoughtPositioned.path}
            simplePath={cursorThoughtPositioned.simplePath}
            height={cursorThoughtPositioned.height}
            x={cursorThoughtPositioned.x}
            y={cursorThoughtPositioned.y}
            showContexts={cursorThoughtPositioned.showContexts}
            width={cursorThoughtPositioned.width}
            parentId={head(parentOf(cursorThoughtPositioned.path))}
          />
        )}
        <TransitionGroup>
          {treeThoughtsPositioned.map((thought, index) => (
            <TreeNode
              {...thought}
              index={index}
              // Pass unique key for the component
              key={thought.key}
              // Pass the thought key as a thoughtKey and not key property as it will conflict with React's key
              thoughtKey={thought.key}
              editing={editing || false}
              {...{
                viewportBottom,
                treeThoughtsPositioned,
                bulletWidth,
                cursorUncleId,
                setSize,
                cliffPaddingStyle,
                dragInProgress,
                autofocusDepth,
              }}
            />
          ))}
        </TransitionGroup>
      </div>
    </div>
  )
}

export default LayoutTree
