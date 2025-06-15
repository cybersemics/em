import { useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import DeleteDrop from './DeleteDrop'
import SlideTransition from './SlideTransition'

/** A panel of buttons that slides out from the right edge of the screen during drag-and-drop to quickly execute certain commands on a droppedthought. */
const QuickDropPanel = () => {
  const isDragging = useSelector(state => state.dragHold || state.dragInProgress)
  const quickDropPanelRef = useRef<HTMLDivElement>(null)

  return (
    <SlideTransition duration='fast' nodeRef={quickDropPanelRef} in={isDragging} from='right' unmountOnExit>
      <div
        ref={quickDropPanelRef}
        className={css({ position: 'fixed', right: 0, top: '20vh', zIndex: 'popup' })}
        data-testid='quick-drop-panel'
      >
        <DeleteDrop />
      </div>
    </SlideTransition>
  )
}

export default QuickDropPanel
