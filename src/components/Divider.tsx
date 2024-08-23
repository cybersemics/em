import classNames from 'classnames'
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import Path from '../@types/Path'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import attributeEquals from '../selectors/attributeEquals'
import store from '../stores/app'
import editingValueStore from '../stores/editingValue'
import fastClick from '../util/fastClick'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import parentOf from '../util/parentOf'
import { TreeMapContext, TreeMapContextType } from './LayoutTree'

const DIVIDER_PLUS_PX = 20
const DIVIDER_MIN_WIDTH = 85

/** A custom horizontal rule. */
const Divider = ({ path }: { path: Path }) => {
  const dispatch = useDispatch()
  const dividerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(DIVIDER_MIN_WIDTH)
  const { treeMap } = useContext(TreeMapContext)

  const parentPath = parentOf(path)
  const grandparentPath = parentOf(parentPath)
  const isTable = attributeEquals(store.getState(), head(grandparentPath), '=view', 'Table')
  const isTableCol1 = attributeEquals(store.getState(), head(parentPath), '=view', 'Table')

  /** Check if the element is a new divider, which initially has an empty value causing isDivider to return a false negative. */
  const isNewDivider = (treeMapItem: TreeMapContextType) => {
    const emptyValue = treeMapItem[1].nodeData.thought.value === ''
    const hasDividerClass = treeMapItem[1].treeNode.querySelector('.divider')
    return emptyValue && hasDividerClass
  }

  /** Get nearby elements to calculate divider width. */
  const elements = useMemo(() => {
    if (Object.keys(treeMap).length === 0) return []
    const hashedParentPath = hashPath(parentPath)

    let entries = Object.entries(treeMap).filter(
      ([key, { nodeData, staticThought }]) =>
        key.startsWith(hashedParentPath) &&
        (isTable || key !== hashedParentPath) &&
        !isDivider(nodeData.thought.value) &&
        staticThought,
    )

    if (isTable && entries.length <= 1) {
      const hashedGrandparentPath = hashPath(grandparentPath)

      entries = Object.entries(treeMap).filter(
        ([key, { nodeData, staticThought }]) =>
          key.startsWith(hashedGrandparentPath) &&
          key !== hashedGrandparentPath &&
          !isDivider(nodeData.thought.value) &&
          staticThought,
      )
    }

    return entries
      .map(entry => {
        // TODO: Figure out why isTableCol1 is not being updated correctly on an element's nodeData from LayoutTree.
        // Sometimes it's false on nodes that should be true.
        // This works around it by recalculating it, but it's more expensive.
        const isTableCol1 = attributeEquals(store.getState(), head(parentOf(entry[1].nodeData.path)), '=view', 'Table')
        return [entry[0], { ...entry[1], nodeData: { ...entry[1].nodeData, isTableCol1 } }]
      })
      .filter(element => isTableCol1 === element[1].nodeData.isTableCol1 && !isNewDivider(element))
  }, [grandparentPath, isTable, isTableCol1, parentPath, treeMap])

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  /** Get the max width of nearby elements, add DIVIDER_PLUS_PX and set this width for divider. */
  const setStyle = () => {
    setWidth(Math.max(...elements.map(element => element[1].staticThought.offsetWidth)) + DIVIDER_PLUS_PX)
  }

  /** Trigger setStyle when appropriate. */
  useEffect(setStyle, [elements])
  editingValueStore.useEffect(setStyle)

  return (
    <div
      aria-label='divider'
      ref={dividerRef}
      style={{
        margin: '-2px -4px -5px',
        maxWidth: '100%',
        padding: '10px 4px 16px',
        position: 'relative',
        width: width > DIVIDER_MIN_WIDTH ? width : DIVIDER_MIN_WIDTH,
      }}
      className='divider-container z-index-stack'
      {...fastClick(setCursorToDivider)}
    >
      <div
        className={classNames({
          divider: true,
          // requires editable-hash className to be selected by the cursor navigation via editableNode
          ['editable-' + head(path)]: true,
        })}
      />
    </div>
  )
}

export default Divider
