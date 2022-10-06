import React from 'react'
import { useSelector } from 'react-redux'
import CSSTransition from 'react-transition-group/CSSTransition'
import State from '../@types/State'
import CopyOneDrop from './CopyOneDrop'
import DeleteDrop from './DeleteDrop'

/** Buttons that slide out from the right edge of the screen during drag-and-drop to provide. */
const QuickDrop = () => {
  const isDragging = useSelector((state: State) => state.dragHold || state.dragInProgress)
  return (
    <CSSTransition in={isDragging} timeout={200} classNames='slide-right' unmountOnExit>
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: '20vh',
          zIndex: 9999,
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <DeleteDrop />
        </div>
        <div style={{ marginBottom: 10 }}>
          <CopyOneDrop />
        </div>
      </div>
    </CSSTransition>
  )
}

export default QuickDrop
