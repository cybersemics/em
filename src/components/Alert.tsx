import React, { FC, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import Alert from '../@types/Alert'
import State from '../@types/State'
import alertActionCreator from '../action-creators/alert'
import { deleteResumableFile } from '../action-creators/importFiles'
import { AlertType } from '../constants'
import useSwipeToDismiss from '../hooks/useSwipeToDismiss'
import themeColors from '../selectors/themeColors'
import syncStatusStore from '../stores/syncStatus'
import fastClick from '../util/fastClick'
import CommandPalette from './CommandPalette'

interface AlertProps {
  alert?: Alert | null
  onClose: () => void
}

/** An alert component that fades in and out. */
const AlertWithTransition: FC = ({ children }) => {
  const [isDismissed, setDismiss] = useState(false)
  const dispatch = useDispatch()
  const alert = useSelector((state: State) => state.alert)
  const showCommandPalette = useSelector((state: State) => state.showCommandPalette)

  /** Dismiss the alert on close. */
  const onClose = () => {
    setDismiss(true)
    dispatch(alertActionCreator(null))
  }

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup childFactory={child => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}>
      {alert || showCommandPalette ? (
        <CSSTransition key={0} timeout={800} classNames='fade' onEntering={() => setDismiss(false)}>
          {/* Specify a key to force the component to re-render and thus recalculate useSwipeToDismissProps when the alert changes. Otherwise the alert gets stuck off screen in the dismiss state. */}
          <AlertComponent alert={alert} onClose={onClose} key={alert?.value}>
            {alert?.alertType === AlertType.CommandPaletteGesture || showCommandPalette ? <CommandPalette /> : children}
          </AlertComponent>
        </CSSTransition>
      ) : null}
    </TransitionGroup>
  )
}

/** The alert component itself. Separate so that a key property can be used to force a reset of useSwipeToDismissProps. */
const AlertComponent: FC<AlertProps> = ({ alert, onClose, children }) => {
  const dispatch = useDispatch()
  const colors = useSelector(themeColors)
  const fontSize = useSelector((state: State) => state.fontSize)
  const showCommandPalette = useSelector((state: State) => state.showCommandPalette)
  const useSwipeToDismissProps = useSwipeToDismiss({
    ...(alert?.isInline ? { dx: '-50%' } : null),
    // dismiss after animation is complete to avoid touch events going to the Toolbar
    onDismissEnd: () => {
      dispatch(alertActionCreator(null))
    },
  })

  if (!alert && !showCommandPalette) return null

  return (
    <div
      className='alert z-index-alert'
      {...(alert && alert.alertType !== AlertType.CommandPaletteGesture ? useSwipeToDismissProps : null)}
      // merge style with useSwipeToDismissProps.style (transform, transition, and touchAction for sticking to user's touch)
      style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        // scale with font size to stay vertically centered over toolbar
        padding: `${fontSize / 2 + 2}px 0 1em`,
        color: colors.gray50,
        overflowX: 'hidden',
        overflowY: 'auto',
        maxHeight: '100%',
        maxWidth: '100%',
        /* if inline, leave room on the left side so the user can click undo/redo */
        ...(alert?.isInline ? { left: '50%', width: 'auto' } : null),
        ...(!children ? { textAlign: 'center' } : null),
        ...(alert && alert.alertType !== AlertType.CommandPaletteGesture ? useSwipeToDismissProps.style : null),
      }}
    >
      <div
        className='alert-text'
        style={{ padding: '0.25em 0.5em', backgroundColor: colors.bgOverlay80 }}
        dangerouslySetInnerHTML={!children ? { __html: alert?.value || '' } : undefined}
      >
        {children}
      </div>
      {alert?.importFileId && (
        <a
          onClick={() => {
            deleteResumableFile(alert.importFileId!)
            syncStatusStore.update({ importProgress: 1 })
            onClose()
          }}
        >
          cancel
        </a>
      )}
      {alert?.showCloseLink ? (
        <a className='upper-right status-close-x text-small no-swipe-to-dismiss' {...fastClick(onClose)}>
          ✕
        </a>
      ) : null}
    </div>
  )
}

export default AlertWithTransition
