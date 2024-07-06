import classNames from 'classnames'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Path from '../@types/Path'
import State from '../@types/State'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import rootedParentOf from '../selectors/rootedParentOf'
import editingValueStore from '../stores/editingValue'
import fastClick from '../util/fastClick'
import head from '../util/head'

const DIVIDER_PLUS_PX = 20
const DIVIDER_MIN_WIDTH = 85

/** A custom horizontal rule. */
const Divider = ({ path }: { path: Path }) => {
  const dividerRef = React.createRef<HTMLInputElement>()
  const dispatch = useDispatch()
  const state = useSelector((state: State) => state)
  const [width, setWidth] = useState(DIVIDER_MIN_WIDTH)

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  /** Get the max width of nearby elements, add DIVIDER_PLUS_PX and set this width for divider. */
  const setStyle = () => {
    if (dividerRef.current) {
      const parentPath = rootedParentOf(state, path)

      const treeNode = dividerRef.current.closest('div.tree-node') as HTMLElement
      if (!treeNode) throw new Error('Divider tree node not found')

      const thoughtPath = treeNode.dataset.path?.split(',')
      if (!thoughtPath) throw new Error('Divider path not found on tree node')

      let elements = document.querySelectorAll(
        `.tree-node[data-path^="${parentPath}"]:not(.thought-divider)`,
      ) as NodeListOf<HTMLElement>

      if (elements.length === 1) {
        /** If this divider is an only child in a table, find the widest col2. */
        const grandparentPath = rootedParentOf(state, parentPath)
        if (!grandparentPath) throw new Error('Divider grandparent not found')

        elements = document.querySelectorAll(
          `.tree-node.table-col2[data-path^="${grandparentPath}"]:not(.thought-divider)`,
        ) as NodeListOf<HTMLElement>
      } else if (!elements.length) {
        /** This is a top-level divider, use its siblings instead. */
        elements = document.querySelectorAll('.tree-node.top-level:not(.thought-divider)')
      }

      /** Find and set the max width of our selected elements. */
      const maxWidth = Math.max(
        ...Array.from(elements).map(
          element => (element.querySelector('.thought') as HTMLElement).offsetWidth + DIVIDER_PLUS_PX,
        ),
      )

      setWidth(maxWidth)
    }
  }

  useEffect(setStyle, [dividerRef, state, path])
  editingValueStore.subscribe(setStyle)

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
