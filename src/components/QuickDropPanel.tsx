import { useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import DeleteDrop from './DeleteDrop'

/** A panel of buttons that slides out from the right edge of the screen during drag-and-drop to quickly execute certain commands on a droppedthought. */
const QuickDropPanel = () => {
  const isDragging = useSelector(state => state.dragHold || state.dragInProgress)
  const quickDropPanelRef = useRef<HTMLDivElement>(null)

  return (
    <>
      {isDragging && (
        <div
          ref={quickDropPanelRef}
          className={css({ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 'popup' })}
          data-testid='quick-drop-panel'
        >
          <DeleteDrop />
        </div>
      )}
    </>
  )
}

export default QuickDropPanel
