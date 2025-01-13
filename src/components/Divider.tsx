import React, { useLayoutEffect, useRef, useState } from 'react'
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
import fastClick from '../util/fastClick'
import head from '../util/head'
import isDivider from '../util/isDivider'
import parentOf from '../util/parentOf'

/** Custom hook to fetch divider-related data from the state. */
const useDividerData = (path: Path) => {
  const dividerId = head(path)
  const parentPath = parentOf(path)
  const parentId = head(parentPath)
  const grandParentPath = parentOf(parentPath)
  const grandParentId = head(grandParentPath)

  return useSelector((state: State) => {
    const children = parentId ? getAllChildrenAsThoughts(state, parentId) : []
    const childrenWithoutDividers = children.filter(child => !isDivider(child.value))
    const isOnlyChild = childrenWithoutDividers.length === 0
    const isTableView =
      (parentId && attributeEquals(state, parentId, '=view', 'Table')) ||
      (grandParentId && attributeEquals(state, grandParentId, '=view', 'Table')) ||
      false

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
      parentId,
      isOnlyChild,
      isTableView,
      children,
      thoughtsAtSameDepth,
    }
  })
}

/** Helper function to get widths of thoughts by querying the DOM. */
const getThoughtWidths = (thoughts: { id: ThoughtId }[]) => {
  return thoughts.map(thought => {
    const innerThoughtElement = document.querySelector(
      `[aria-label="tree-node"][data-id="${thought.id}"] [aria-label="thought"]`,
    )
    return innerThoughtElement ? innerThoughtElement.getBoundingClientRect().width : 0
  })
}

/** A custom horizontal rule. */
const Divider = ({ path, cssRaw }: { path: Path; cssRaw?: SystemStyleObject }) => {
  const dispatch = useDispatch()
  const dividerRef = useRef<HTMLDivElement>(null)
  const [dividerWidth, setDividerWidth] = useState<number>(DIVIDER_MIN_WIDTH)

  // Use the custom hook to get necessary data
  const { dividerId, isOnlyChild, isTableView, children, thoughtsAtSameDepth } = useDividerData(path)

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  useLayoutEffect(() => {
    /** Calculates and updates the Divider's width based on sibling thought widths. */
    const updateDividerWidth = () => {
      if (!dividerRef.current) return

      // If the divider is the only child and we're not in Table View
      if (isOnlyChild && !isTableView) {
        setDividerWidth(DIVIDER_MIN_WIDTH)
        return
      }

      let widths: number[] = []

      if (isTableView && isOnlyChild) {
        // In Table View and divider is the only child
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

      // Determine the maximum width
      const maxWidth = widths.length > 0 ? Math.max(...widths) : DIVIDER_MIN_WIDTH
      setDividerWidth(Math.round(Math.max(maxWidth, DIVIDER_MIN_WIDTH)))
    }

    updateDividerWidth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnlyChild, isTableView])

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
