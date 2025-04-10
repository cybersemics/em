import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
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
import editingValueUntrimmedStore from '../stores/editingValueUntrimmed'
import viewportStore from '../stores/viewport'
import head from '../util/head'
import isDivider from '../util/isDivider'

/** Custom hook to fetch thought IDs that affect the divider width. */
const useWidthDependentThoughtIds = (path: Path): ThoughtId[] => {
  return useSelector((state: State) => {
    const parentPath = rootedParentOf(state, path)
    const parentId = head(parentPath)
    const grandParentPath = parentId ? rootedParentOf(state, parentPath) : null
    const grandParentId = grandParentPath ? head(grandParentPath) : null
    const children = parentId ? getAllChildrenAsThoughts(state, parentId) : []
    const childrenWithoutDividers = children.filter(child => !isDivider(child.value))
    const isOnlyChild = childrenWithoutDividers.length === 0
    const isTableView =
      attributeEquals(state, parentId, '=view', 'Table') || attributeEquals(state, grandParentId, '=view', 'Table')

    const dependentThoughtIds = isOnlyChild
      ? isTableView && grandParentId
        ? // If the thought is the only child and in a table view, get the grandchildren's IDs
          getAllChildrenAsThoughts(state, grandParentId)
            .filter(child => !isDivider(child.value))
            .flatMap(parent =>
              (parent.id ? getAllChildrenAsThoughts(state, parent.id) : [])
                .filter(child => !isDivider(child.value))
                .map(child => child.id),
            )
        : // If the thought is the only child but not in a table view, return an empty array
          []
      : // If the thought is not the only child, get the sibling thought IDs
        childrenWithoutDividers.map(child => child.id)

    return dependentThoughtIds
  }, shallowEqual)
}

/**
 * Calculates the width of multiple thoughts by measuring their rendered widths in the DOM.
 */
const getThoughtWidths = (ids: ThoughtId[]): number[] => {
  return ids.map(id => {
    const innerThoughtElement = document.querySelector(`[aria-label="editable-${id}"]`)
    return innerThoughtElement?.getBoundingClientRect().width ?? 0
  })
}

/** A custom horizontal rule. */
const Divider = ({ path, cssRaw }: { path: Path; cssRaw?: SystemStyleObject }) => {
  const dispatch = useDispatch()
  const dividerRef = useRef<HTMLDivElement>(null)
  const [dividerWidth, setDividerWidth] = useState<number>(DIVIDER_MIN_WIDTH)
  const widthDependentThoughtIds = useWidthDependentThoughtIds(path)
  const editingThoughtId = useSelector((state: State) => state.cursor && head(state.cursor))
  const editingValueUntrimmed = editingValueUntrimmedStore.useState()
  const fontSize = useSelector((state: State) => state.fontSize)

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  /** Calculates and updates the Divider's width based on sibling thought widths. */
  const updateDividerWidth = useCallback(() => {
    if (!dividerRef.current) return

    const widths = getThoughtWidths(widthDependentThoughtIds)
    setDividerWidth(Math.max(...widths, DIVIDER_MIN_WIDTH))
  }, [widthDependentThoughtIds])

  useLayoutEffect(updateDividerWidth, [editingThoughtId, editingValueUntrimmed, fontSize, updateDividerWidth])

  viewportStore.useSelectorEffect(updateDividerWidth, state => state.innerWidth)

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
      onClick={setCursorToDivider}
      role='button'
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
