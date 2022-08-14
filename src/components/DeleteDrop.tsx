import React, { useEffect } from 'react'
import { DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import { useSelector } from 'react-redux'
import CSSTransition from 'react-transition-group/CSSTransition'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import alert from '../action-creators/alert'
import deleteThought from '../action-creators/deleteThought'
import { AlertText, AlertType } from '../constants'
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
      alertType: AlertType.DeleteThoughtComplete,
      clearDelay: 8000,
      showCloseLink: true,
    }),
  ])
}

/** Show an alert on hover that notifies the user the thought will be deleted if dropped on the icon. */
const hover = (isHovering: boolean) => {
  const state = store.getState()
  const value = state.draggingThought && getThoughtById(state, head(state.draggingThought))?.value

  if (isHovering || state.alert?.alertType === AlertType.DeleteDropHint) {
    store.dispatch(
      alert(isHovering ? `Drop to delete ${ellipsize(value!)}` : AlertText.DragAndDrop, {
        alertType: isHovering ? AlertType.DeleteDropHint : AlertType.DragAndDropHint,
        showCloseLink: false,
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
  const isDragging = useSelector((state: State) => state.dragHold || state.dragInProgress)

  useEffect(() => {
    hover(isHovering)
  }, [isHovering])

  return (
    <CSSTransition in={isDragging} timeout={200} classNames='slide-right' unmountOnExit>
      {dropTarget(
        <div
          className='delete-drop z-index-stack'
          style={{
            position: 'fixed',
            padding: '1em',
            margin: '-1em',
            right: '1em',
            top: '20vh',
            borderRadius: '999px 0 0 999px',
            backgroundColor: isHovering ? 'rgba(40,40,40,0.8)' : 'rgba(30,30,30,0.8)',
          }}
        >
          <DeleteIcon
            size={fontSize * 1.5}
            fill={isHovering ? (dark ? 'lightblue' : 'royalblue') : dark ? 'white' : 'black'}
            // disable default .icon transition so that highlight is immediate
            style={{ cursor: 'move', transition: 'none', verticalAlign: 'middle' }}
          />
        </div>,
      )}
    </CSSTransition>
  )
}

export default DropTarget('thought', { drop }, dropCollect)(DeleteDrop)
