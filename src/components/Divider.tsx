import classNames from 'classnames'
import React, { createRef, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Path from '../@types/Path'
import State from '../@types/State'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import editingValueStore from '../stores/editingValue'
import fastClick from '../util/fastClick'
import hashPath from '../util/hashPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

const DIVIDER_PLUS_PX = 20
const DIVIDER_MIN_WIDTH = 85

/** A custom horizontal rule. */
const Divider = ({ path }: { path: Path }) => {
  const dispatch = useDispatch()
  const dividerRef = createRef<HTMLDivElement>()
  const thoughtIndex = useSelector((state: State) => state.thoughts.thoughtIndex)
  const [width, setWidth] = useState(DIVIDER_MIN_WIDTH)

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  /** Get the max width of nearby elements, add DIVIDER_PLUS_PX and set this width for divider. */
  const setStyle = () => {
    if (dividerRef.current) {
      const parentPath = parentOf(path)

      const treeNode = dividerRef.current.closest('div.tree-node') as HTMLElement
      if (!treeNode) throw new Error('Divider tree node not found')

      const thoughtPath = treeNode.dataset.path
      if (!thoughtPath || thoughtPath === '') throw new Error('Divider path not found on tree node')

      let elements = document.querySelectorAll(`.tree-node[data-path^="${hashPath(parentPath)}"]:not(.thought-divider)`)

      if (elements.length === 1) {
        /** If this divider is an only child, search further up the tree. */
        const grandparentPath = parentOf(parentPath)
        if (!grandparentPath) throw new Error('Divider grandparent not found')

        elements = document.querySelectorAll(
          `.tree-node[data-path^="${hashPath(grandparentPath)}"]:not(.thought-divider)`,
        )
      } else if (!elements.length) {
        /** This is a top-level divider, use its siblings instead. */
        elements = document.querySelectorAll('.tree-node.top-level:not(.thought-divider)')
      }

      /** Find and set the max width of our selected elements. */
      const maxWidth = Math.max(
        ...Array.from(elements).map(element => (element.querySelector('.thought') as HTMLElement).offsetWidth),
      )

      setWidth(maxWidth + DIVIDER_PLUS_PX)
    }
  }

  useEffect(setStyle, [path, thoughtIndex]) // eslint-disable-line react-hooks/exhaustive-deps
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
