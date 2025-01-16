import React, { useCallback, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { DIVIDER_MIN_WIDTH } from '../constants'
import useSelectorEffect from '../hooks/useSelectorEffect'
import attributeEquals from '../selectors/attributeEquals'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import fastClick from '../util/fastClick'
import head from '../util/head'
import isDivider from '../util/isDivider'
import parentOf from '../util/parentOf'

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

  const dividerId = head(path)
  const parentPath = parentOf(path)
  const parentId = head(parentPath)
  const grandParentPath = parentOf(parentPath)
  const grandParentId = head(grandParentPath)

  /** Selector function to fetch necessary data from the state. */
  const selectDividerData = useCallback(
    (state: State) => {
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
        isOnlyChild,
        isTableView,
        children,
        thoughtsAtSameDepth,
      }
    },
    [parentId, grandParentId],
  )

  /** Updates the Divider's width based on sibling thought widths. */
  const updateDividerWidth = useCallback(
    (dividerData: ReturnType<typeof selectDividerData>) => {
      const { isOnlyChild, isTableView, children, thoughtsAtSameDepth } = dividerData

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
        const siblingThoughts = children.filter(child => child.id !== dividerId && !isDivider(child.value))
        if (siblingThoughts.length === 0) {
          setDividerWidth(DIVIDER_MIN_WIDTH)
          return
        }
        widths = getThoughtWidths(siblingThoughts)
      }

      const maxWidth = widths.length > 0 ? Math.max(...widths) : DIVIDER_MIN_WIDTH
      setDividerWidth(Math.round(Math.max(maxWidth, DIVIDER_MIN_WIDTH)))
    },
    [dividerRef, dividerId],
  )

  // Use useSelectorEffect to watch for changes in the necessary state slices
  useSelectorEffect(updateDividerWidth, selectDividerData)

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

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
