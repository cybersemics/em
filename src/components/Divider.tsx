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

/** A custom horizontal rule. */
const Divider = ({ path, cssRaw }: { path: Path; cssRaw?: SystemStyleObject }) => {
  const dividerRef = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()

  // State to store the calculated width
  const [dividerWidth, setDividerWidth] = useState<number>(DIVIDER_MIN_WIDTH)

  const dividerId = head(path) as ThoughtId
  const parentPath = parentOf(path)
  const parentId = head(parentPath) as ThoughtId | undefined
  const grandParentPath = parentOf(parentPath)
  const grandParentId = head(grandParentPath) as ThoughtId | undefined

  // Use useSelector to get the necessary data from the state
  const { isOnlyChild, isTableView, children, thoughtsAtSameDepth } = useSelector((state: State) => {
    // Get immediate children of the parent
    const children = parentId ? getAllChildrenAsThoughts(state, parentId) : []

    // Exclude dividers
    const childrenWithoutDividers = children.filter(child => !isDivider(child.value))

    // Determine if the divider is the only child (excluding dividers)
    const isOnlyChild = childrenWithoutDividers.length === 0

    // Check if the node is in Table View by inspecting the parent and grandparent
    const isTableView =
      (parentId && attributeEquals(state, parentId, '=view', 'Table')) ||
      (grandParentId && attributeEquals(state, grandParentId, '=view', 'Table')) ||
      false

    let thoughtsAtSameDepth: { id: ThoughtId; value: string }[] = []

    if (isTableView && isOnlyChild && grandParentId) {
      // In Table View and divider is the only child

      // Get siblings of the parent (children of grandparent)
      const parentSiblings = getAllChildrenAsThoughts(state, grandParentId)

      // Include the parent itself if parentId is defined
      const allParents = parentId ? [{ id: parentId, value: '' }, ...parentSiblings] : [...parentSiblings]

      // For each parent (siblings and the parent itself), get their immediate children
      thoughtsAtSameDepth = allParents.flatMap(parent => {
        const childrenOfParent = parent.id ? getAllChildrenAsThoughts(state, parent.id) : []
        // Exclude dividers
        return childrenOfParent.filter(child => !isDivider(child.value))
      })
    }

    return {
      isOnlyChild,
      isTableView,
      children,
      thoughtsAtSameDepth,
    }
  })

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  useLayoutEffect(() => {
    /** Calculates and updates the Divider's width based on sibling thought widths. */
    const updateDividerWidth = () => {
      if (dividerRef.current) {
        if (isOnlyChild && !isTableView) {
          // If the divider is the only child and we're not in Table View
          setDividerWidth(DIVIDER_MIN_WIDTH)
          return
        }

        let widths: number[] = []

        if (isTableView && isOnlyChild) {
          // In Table View and divider is the only child

          if (thoughtsAtSameDepth.length === 0) {
            // If there are no thoughts at the same depth (excluding dividers)
            setDividerWidth(DIVIDER_MIN_WIDTH)
            return
          }

          // Get widths of thoughts at the same depth by querying the DOM
          widths = thoughtsAtSameDepth.map(thought => {
            const innerThoughtElement = document.querySelector(
              `[aria-label="tree-node"][data-id="${thought.id}"] [aria-label="thought"]`,
            ) as HTMLElement

            if (innerThoughtElement) {
              const width = innerThoughtElement.getBoundingClientRect().width
              return width
            } else {
              return 0
            }
          })
        } else {
          // Non-table View Mode or Divider is not the only item

          // Get sibling thoughts excluding the divider itself and dividers
          const siblingThoughts = children.filter(child => child.id !== dividerId && !isDivider(child.value))

          if (siblingThoughts.length === 0) {
            setDividerWidth(DIVIDER_MIN_WIDTH)
            return
          }

          // Get widths of sibling thoughts by querying the DOM
          widths = siblingThoughts.map(thought => {
            const innerThoughtElement = document.querySelector(
              `[aria-label="tree-node"][data-id="${thought.id}"] [aria-label="thought"]`,
            ) as HTMLElement

            if (innerThoughtElement) {
              const width = innerThoughtElement.getBoundingClientRect().width
              return width
            } else {
              return 0
            }
          })
        }

        // Determine the maximum width
        const maxWidth = widths.length > 0 ? Math.max(...widths) : DIVIDER_MIN_WIDTH
        setDividerWidth(Math.round(Math.max(maxWidth, DIVIDER_MIN_WIDTH)))
      }
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
            // requires editable-hash className to be selected by the cursor navigation via editableNode
          },
          cssRaw,
        )}
      />
    </div>
  )
}

export default Divider
