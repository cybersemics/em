import React, { useEffect } from 'react'
import { DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import { useSelector } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import alert from '../action-creators/alert'
import deleteThought from '../action-creators/deleteThought'
import { AlertText } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import theme from '../selectors/theme'
import { store } from '../store'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import { SubthoughtsProps } from './Subthoughts'
import DeleteIcon from './icons/DeleteIcon'

/** Delete the thought on drop. */
const drop = (props: SubthoughtsProps, monitor: DropTargetMonitor) => {
  const state = store.getState()
  const { simplePath } = monitor.getItem() as { simplePath: SimplePath }
  const value = getThoughtById(state, head(simplePath))?.value

  store.dispatch([
    deleteThought({
      pathParent: rootedParentOf(state, simplePath),
      thoughtId: head(simplePath),
    }),
    alert(`Deleted ${ellipsize(value)}`, {
      alertType: 'deleteThoughtComplete',
      clearDelay: 8000,
      showCloseLink: true,
    }),
  ])
}

/** Show an alert on hover that notifies the user the thought will be deleted if dropped on the icon. */
const hover = (isHovering: boolean) => {
  const state = store.getState()
  const value = state.draggingThought && getThoughtById(state, head(state.draggingThought))?.value

  if (isHovering || state.alert?.alertType === 'deleteDropHint') {
    store.dispatch(
      alert(isHovering ? `Drop to delete ${ellipsize(value!)}` : AlertText.dragAndDropHint, {
        alertType: isHovering ? 'deleteDropHint' : 'dragAndDrop',
      }),
    )
  }
}

/** Creates the props for drop. */
const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  dropTarget: connect.dropTarget(),
  isDragInProgress: monitor.getItem() as boolean,
  isHovering: monitor.isOver({ shallow: true }),
})

/** An icon that a thought can be dropped on to delete. */
const DeleteDrop = ({ dropTarget, isDragInProgress, isHovering }: ReturnType<typeof dropCollect>) => {
  const dark = useSelector((state: State) => theme(state) !== 'Light')
  const fontSize = useSelector((state: State) => state.fontSize)
  useEffect(() => {
    hover(isHovering)
  }, [isHovering])

  return dropTarget(
    <div style={{ padding: '1em', margin: '-1em' }}>
      <DeleteIcon
        size={fontSize * 1.25}
        fill={isHovering ? (dark ? 'lightblue' : 'royalblue') : dark ? 'white' : 'black'}
        // disable default .icon transition so that highlight is immediate
        style={{ cursor: 'move', transition: 'none' }}
      />
    </div>,
  )
}

export default DropTarget('thought', { drop }, dropCollect)(DeleteDrop)
