import React from 'react'
import { Key } from 'ts-key-enum'
import { attributeEquals } from '../selectors'
import { parentOf, getElementPaddings, pathToContext } from '../util'
import { cursorUp, scrollCursorIntoView } from '../action-creators'
import { Icon as IconType, Shortcut } from '../types'

// import directly since util/index is not loaded yet when shortcut is initialized
import { throttleByAnimationFrame } from '../util/throttleByAnimationFrame'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }: IconType) => <svg version='1.1' className='icon' xmlns='http://www.w3.org/2000/svg' width={size} height={size} fill={fill} style={style} viewBox='0 0 19.481 19.481' enableBackground='new 0 0 19.481 19.481'>
  <g>
    <path d='m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z' />
  </g>
</svg>

/** Returns true if the selection is on the second or greater line of a multi-line editable. */
const isSelectionOnMultiLine = () => {

  const selection = window.getSelection()
  if (!selection) return false

  const { anchorNode: baseNode, rangeCount } = selection
  if (rangeCount === 0) return false

  const clientRects = selection.getRangeAt(0).getClientRects()
  if (!clientRects?.length) return false

  const { y: rangeY } = clientRects[0]
  if (!rangeY) return false

  const baseNodeParentEl = baseNode?.parentElement as HTMLElement
  if (!baseNodeParentEl) return false

  const { y: baseNodeY } = baseNodeParentEl.getClientRects()[0]
  const [paddingTop] = getElementPaddings(baseNodeParentEl)

  // allow error of 5px
  const isOnFirstLine = Math.abs(rangeY - baseNodeY - paddingTop) < 5
  return !isOnFirstLine
}

const cursorUpShortcut: Shortcut = {
  id: 'cursorUp',
  name: 'Cursor Up',
  keyboard: { key: Key.ArrowUp },
  hideFromInstructions: true,
  svg: Icon,
  canExecute: getState => {

    const state = getState()
    const { cursor } = state

    if (!cursor) return true

    // use default browser behavior in prose mode
    const contextRanked = parentOf(cursor)
    const isProseView = attributeEquals(state, pathToContext(contextRanked), '=view', 'Prose')
    const isProseMode = isProseView && window.getSelection()?.focusOffset as number > 0
    if (isProseMode) return false

    // use default browser if selection is on the second or greater line of a multi-line editable
    const isMultiLine = isSelectionOnMultiLine()
    if (isMultiLine) return false

    return true
  },
  exec: throttleByAnimationFrame(dispatch => {
    dispatch(cursorUp())
    dispatch(scrollCursorIntoView())
  })
}

export default cursorUpShortcut
