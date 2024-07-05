import classNames from 'classnames'
import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import Path from '../@types/Path'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import fastClick from '../util/fastClick'
import head from '../util/head'

const DIVIDER_PLUS_PX = 20
const DIVIDER_MIN_WIDTH = 85

/** A custom horizontal rule. */
const Divider = ({ path }: { path: Path }) => {
  const dividerRef = React.createRef<HTMLInputElement>()
  const dispatch = useDispatch()
  const [width, setWidth] = useState(DIVIDER_MIN_WIDTH)

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  /** Get the max width of nearby for divider list child elements, add DIVIDER_PLUS_PX and set this width for divider. */
  const setStyle = () => {
    if (dividerRef.current) {
      const parentNode = dividerRef.current.closest('div.tree-node')
      if (!parentNode) throw new Error('Parent node not found')

      /** Get the depth of this thought's node. */
      const parentDepth = parentNode ? parseInt(parentNode.getAttribute('data-depth') || '0') : 0
      const siblingNodes = Array.from(document.querySelectorAll(`.tree-node[data-depth="${parentDepth}"]`))

      /** Find the largest child node and set the width of the divider to its width plus DIVIDER_PLUS_PX. */
      const maxWidth = Math.max(
        ...siblingNodes.map(node => {
          const subthought = node.querySelector('.thought:not(.thought-divider)') as HTMLElement
          return subthought ? subthought.offsetWidth + DIVIDER_PLUS_PX : DIVIDER_PLUS_PX
        }),
      )

      setWidth(maxWidth)
    }
  }

  useEffect(setStyle)

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
