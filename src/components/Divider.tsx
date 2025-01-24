import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { DIVIDER_MIN_WIDTH } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import rootedParentOf from '../selectors/rootedParentOf'
import fastClick from '../util/fastClick'
import head from '../util/head'
import isDivider from '../util/isDivider'

/** Custom hook to fetch divider-related data from the state, using rootedParentOf instead of parentOf. */
const useDividerData = (path: Path) => {
  return useSelector(
    (state: State) => {
      const dividerId = head(path)
      const parentPath = rootedParentOf(state, path)
      const parentId = head(parentPath)
      const grandParentPath = parentId ? rootedParentOf(state, parentPath) : []
      const grandParentId = head(grandParentPath)
      const children = parentId ? getAllChildrenAsThoughts(state, parentId) : []
      const childrenWithoutDividers = children.filter(child => !isDivider(child.value))
      const isOnlyChild = childrenWithoutDividers.length === 0
      const isTableView =
        (parentId && attributeEquals(state, parentId, '=view', 'Table')) ||
        (grandParentId && attributeEquals(state, grandParentId, '=view', 'Table'))

      let thoughtsAtSameDepth: { id: ThoughtId; value: string }[] = []

      if (isTableView && isOnlyChild && grandParentId) {
        const parentSiblings = getAllChildrenAsThoughts(state, grandParentId)
        thoughtsAtSameDepth = parentSiblings.flatMap(parent => {
          const childrenOfParent = parent.id ? getAllChildrenAsThoughts(state, parent.id) : []
          return childrenOfParent.filter(child => !isDivider(child.value))
        })
      }

      return {
        dividerId,
        isOnlyChild,
        isTableView,
        children,
        thoughtsAtSameDepth,
      }
    },
    (prev, next) => {
      return (
        prev.dividerId === next.dividerId &&
        prev.isOnlyChild === next.isOnlyChild &&
        prev.isTableView === next.isTableView &&
        prev.children.length === next.children.length &&
        prev.thoughtsAtSameDepth.length === next.thoughtsAtSameDepth.length
      )
    },
  )
}

/**
 * Calculates the width of the thought text, including trailing spaces, to ensure the divider width matches the visual representation.
 */
const getThoughtWidths = (thoughts: { id: ThoughtId }[]) => {
  return thoughts.map(thought => {
    const innerThoughtElement = document.querySelector(
      `[aria-label="tree-node"][data-id="${thought.id}"] [aria-label="thought"]`,
    )

    // Use DOM widths for thoughts
    return innerThoughtElement?.getBoundingClientRect().width ?? 0
  })
}

/** A custom horizontal rule. */
const Divider = ({ path, cssRaw }: { path: Path; cssRaw?: SystemStyleObject }) => {
  const dispatch = useDispatch()
  const dividerRef = useRef<HTMLDivElement>(null)
  const [dividerWidth, setDividerWidth] = useState<number>(DIVIDER_MIN_WIDTH)
  const { dividerId, isOnlyChild, isTableView, children, thoughtsAtSameDepth } = useDividerData(path)

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  useEffect(() => {
    /** Calculates and updates the Divider's width based on sibling thought widths. */
    const updateDividerWidth = () => {
      if (!dividerRef.current) return

      if (isOnlyChild && !isTableView) {
        setDividerWidth(DIVIDER_MIN_WIDTH)
        return
      }

      let widths: number[] = []
      if (isTableView && isOnlyChild) {
        if (thoughtsAtSameDepth.length === 0) {
          setDividerWidth(DIVIDER_MIN_WIDTH)
          return
        }
        widths = getThoughtWidths(thoughtsAtSameDepth)
      } else {
        // Non-Table View or Divider is not the only item
        const siblingThoughts = children.filter(child => child.id !== dividerId && !isDivider(child.value))

        if (siblingThoughts.length === 0) {
          setDividerWidth(DIVIDER_MIN_WIDTH)
          return
        }
        widths = getThoughtWidths(siblingThoughts)
      }

      setDividerWidth(Math.round(Math.max(...widths, DIVIDER_MIN_WIDTH)))
    }

    updateDividerWidth() // Initial call to set the width

    const resizeObservers: ResizeObserver[] = []

    const thoughtsToObserve =
      isTableView && isOnlyChild
        ? thoughtsAtSameDepth
        : children.filter(child => child.id !== dividerId && !isDivider(child.value))

    thoughtsToObserve.forEach(thought => {
      const thoughtElement = document.querySelector(
        `[aria-label="tree-node"][data-id="${thought.id}"] [aria-label="thought"]`,
      )
      if (thoughtElement) {
        const resizeObserver = new ResizeObserver(() => {
          updateDividerWidth()
        })
        resizeObserver.observe(thoughtElement)
        resizeObservers.push(resizeObserver)
      }
    })

    return () => resizeObservers.forEach(observer => observer.disconnect())
  }, [children, thoughtsAtSameDepth, isOnlyChild, isTableView, dividerId])

  return (
    <div
      aria-label='divider'
      ref={dividerRef}
      className={css({
        margin: '-2px -4px -5px',
        marginLeft: '-20px',
        padding: '10px 4px 16px',
        position: 'relative',
        zIndex: 'stack',
      })}
      style={{ width: `${dividerWidth}px` }}
      {...fastClick(setCursorToDivider)}
    >
      <div
        aria-label={'editable-' + head(path)}
        className={css(
          {
            border: 'solid 1px {colors.divider}',
          },
          cssRaw,
        )}
      />
    </div>
  )
}

export default Divider
