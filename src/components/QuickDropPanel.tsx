import { Capacitor } from '@capacitor/core'
import { useRef } from 'react'
import { useSelector } from 'react-redux'
import CSSTransition from 'react-transition-group/CSSTransition'
import { css } from '../../styled-system/css'
import { isTouch } from '../browser'
import durations from '../util/durations'
import CopyOneDrop from './CopyOneDrop'
import DeleteDrop from './DeleteDrop'
import ExportDrop from './ExportDrop'

/** A panel of buttons that slides out from the right edge of the screen during drag-and-drop to quickly execute certain commands on a droppedthought. */
const QuickDropPanel = () => {
  const isDragging = useSelector(state => state.dragHold || state.dragInProgress)
  const quickDropPanelRef = useRef<HTMLDivElement>(null)

  return (
    <CSSTransition
      nodeRef={quickDropPanelRef}
      in={isDragging}
      timeout={durations.get('fastDuration')}
      classNames='slide-right'
      unmountOnExit
    >
      <div
        ref={quickDropPanelRef}
        className={css({ position: 'fixed', right: 0, top: '20vh', zIndex: 'popup' })}
        data-testid='quick-drop-panel'
      >
        <DeleteDrop />
        {
          // CopyOneDrop does not work on Mobile Safari, so temporarily disable it.
          // Works fine in capacitor with the clipboard plugin.
          // https://github.com/cybersemics/em/issues/1679
          !isTouch || Capacitor.isNativePlatform() ? <CopyOneDrop /> : null
        }
        <ExportDrop />
      </div>
    </CSSTransition>
  )
}

export default QuickDropPanel
