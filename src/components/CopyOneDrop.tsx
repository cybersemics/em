import React, { useEffect } from 'react'
import { DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import { useSelector } from 'react-redux'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtZone from '../@types/DragThoughtZone'
import State from '../@types/State'
import alert from '../action-creators/alert'
import { AlertText, AlertType } from '../constants'
import copy from '../device/copy'
import getThoughtById from '../selectors/getThoughtById'
import theme from '../selectors/theme'
import { store } from '../store'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import { SubthoughtsProps } from './Subthoughts'
import CopyClipboard from './icons/CopyClipboard'

/** Copy the thought on drop. */
const drop = (props: SubthoughtsProps, monitor: DropTargetMonitor) => {
  const state = store.getState()
  const { simplePath } = monitor.getItem() as DragThoughtItem

  const value = getThoughtById(state, head(simplePath))?.value
  copy(value)
  store.dispatch([
    alert(`Copied ${ellipsize(value)} to the clipboard`, {
      alertType: AlertType.Clipboard,
      clearDelay: 8000,
      showCloseLink: true,
    }),
  ])
}

/** Show an alert on hover that notifies the user the thought will be copied if dropped on the icon. */
const hover = (isHovering: boolean, zone: DragThoughtZone) => {
  const state = store.getState()
  const value = state.draggingThought && getThoughtById(state, head(state.draggingThought))?.value

  if (isHovering || state.alert?.alertType === AlertType.CopyOneDropHint) {
    const message = isHovering
      ? `Drop to copy ${ellipsize(value!)}`
      : zone === DragThoughtZone.Thoughts
      ? AlertText.DragAndDrop
      : AlertText.ReorderFavorites
    store.dispatch(
      alert(message, {
        alertType: isHovering ? AlertType.CopyOneDropHint : AlertType.DragAndDropHint,
        showCloseLink: false,
      }),
    )
  }
}

/** Creates the props for drop. */
const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  dropTarget: connect.dropTarget(),
  isDragInProgress: !!monitor.getItem(),
  zone: monitor.getItem()?.zone || null,
  isHovering: monitor.isOver({ shallow: true }),
})

/** An icon that a thought can be dropped on to copy. */
const CopyOneDrop = ({ dropTarget, isDragInProgress, isHovering, zone }: ReturnType<typeof dropCollect>) => {
  const dark = useSelector((state: State) => theme(state) !== 'Light')
  const fontSize = useSelector((state: State) => state.fontSize)

  useEffect(() => {
    hover(isHovering, zone)
  }, [isHovering])

  return dropTarget(
    <div
      className='z-index-stack'
      style={{
        padding: '1em',
        borderRadius: '999px 0 0 999px',
        backgroundColor: isHovering ? 'rgba(40,40,40,0.8)' : 'rgba(30,30,30,0.8)',
      }}
    >
      <CopyClipboard
        size={fontSize * 1.5}
        fill={isHovering ? (dark ? 'lightblue' : 'royalblue') : dark ? 'white' : 'black'}
        // disable default .icon transition so that highlight is immediate
        style={{ cursor: 'move', transition: 'none', verticalAlign: 'middle' }}
      />
    </div>,
  )
}

export default DropTarget('thought', { drop }, dropCollect)(CopyOneDrop)
