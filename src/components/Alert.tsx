import _ from 'lodash'
import React, { FC, useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import Alert from '../@types/Alert'
import Shortcut from '../@types/Shortcut'
import State from '../@types/State'
import alertActionCreator from '../action-creators/alert'
import { deleteResumableFile } from '../action-creators/importFiles'
import GestureDiagram from '../components/GestureDiagram'
import { AlertType, GESTURE_CANCEL_ALERT_TEXT } from '../constants'
import useSwipeToDismiss from '../hooks/useSwipeToDismiss'
import themeColors from '../selectors/themeColors'
import { gestureString, globalShortcuts } from '../shortcuts'
import syncStatusStore from '../stores/syncStatus'
import fastClick from '../util/fastClick'
import CommandPalette from './CommandPalette'

interface AlertProps {
  alert?: Alert | null
  onClose: () => void
}

/** Renders a GestureDiagram and its label as a hint during a MultiGesture. */
const ShortcutGestureHint = ({
  gestureInProgress,
  keyboardInProgress,
  selected,
  shortcut,
  style,
}: {
  gestureInProgress: string
  keyboardInProgress: string
  selected?: boolean
  shortcut: Shortcut
  style?: React.CSSProperties
}) => {
  const colors = useSelector(themeColors)
  const highlightIndexStart = shortcut.label.toLowerCase().indexOf(keyboardInProgress)
  const highlightIndexEnd = highlightIndexStart + keyboardInProgress.length
  return (
    <div
      style={{
        backgroundColor: selected ? '#212121' : undefined,
        padding: selected ? 10 : undefined,
        marginBottom: 10,
        marginLeft: selected ? '-0.5em' : undefined,
        position: 'relative',
        textAlign: 'left',
        ...style,
      }}
    >
      {gestureInProgress && (
        <GestureDiagram
          highlight={gestureInProgress.length}
          path={gestureString(shortcut)}
          strokeWidth={4}
          style={{ position: 'absolute', left: selected ? '-1.75em' : '-2.2em', top: selected ? '-0.2em' : '-0.75em' }}
          width={45}
          height={45}
        />
      )}
      <div style={{ color: gestureInProgress === shortcut.gesture ? colors.vividHighlight : colors.fg }}>
        {shortcut.label.slice(0, highlightIndexStart)}
        <span style={{ color: colors.vividHighlight }}>
          {shortcut.label.slice(highlightIndexStart, highlightIndexEnd)}
        </span>
        {shortcut.label.slice(highlightIndexEnd)}
      </div>
      {selected && <div style={{ fontSize: '80%' }}>{shortcut.description}</div>}
    </div>
  )
}

/** Render an extended gesture hint with embedded GestureDiagrams. Handled here to avoid creating a HOC or cause AppComponent to re-render too frequently. This could be separated into a HOC or hook if needed. */
const ExtendedGestureHint: FC = () => {
  const store = useStore()
  const alert = useSelector((state: State) => state.alert)
  const showCommandPalette = useSelector((state: State) => state.showCommandPalette)
  const fontSize = useSelector((state: State) => state.fontSize)
  const [keyboardInProgress, setKeyboardInProgress] = useState('')
  const show = alert?.value || showCommandPalette

  // when the extended gesture hint is activated, the alert value is co-opted to store the gesture that is in progress
  const gestureInProgress = alert?.value === '*' ? '' : alert?.value || ''

  // get the shortcuts that can be executed from the current gesture in progress
  const possibleShortcutsSorted = useMemo(() => {
    if (!show) return []

    const possibleShortcuts = globalShortcuts.filter(
      shortcut =>
        !shortcut.hideFromInstructions &&
        (showCommandPalette
          ? // keyboard
            shortcut.label.toLowerCase().includes(keyboardInProgress)
          : // gesture
            shortcut.gesture && gestureString(shortcut).startsWith(gestureInProgress)),
    )

    // sorted shortcuts
    return _.sortBy(possibleShortcuts, shortcut =>
      [
        // gesture length
        gestureInProgress ? shortcut.gesture?.length : '',
        // label that starts with keyboardInProgress
        shortcut.label.toLowerCase().startsWith(keyboardInProgress) ? 0 : 1,
        // label
        shortcut.label,
      ].join('\x00'),
    )
  }, [gestureInProgress, keyboardInProgress, showCommandPalette])

  /** Handler for command palette selection. */
  const onSelect = useCallback(
    (e: Event, value: string) => {
      // TODO: Why is keyboardInProgress that we have closure over empty and possibleShortcutsSorted unfiltered?
      const keyboardInProgress = value

      const possibleShortcuts = globalShortcuts.filter(
        shortcut =>
          !shortcut.hideFromInstructions &&
          (showCommandPalette
            ? // keyboard
              shortcut.label.toLowerCase().includes(keyboardInProgress)
            : // gesture
              shortcut.gesture && gestureString(shortcut).startsWith(gestureInProgress)),
      )

      const shortcutsSorted = _.sortBy(possibleShortcuts, shortcut =>
        [
          // gesture length
          gestureInProgress ? shortcut.gesture?.length : '',
          // label that starts with _keyboardInProgress
          shortcut.label.toLowerCase().startsWith(keyboardInProgress) ? 0 : 1,
          // label
          shortcut.label,
        ].join('\x00'),
      )

      setTimeout(() => {
        shortcutsSorted[0].exec(store.dispatch, store.getState, e, { type: 'commandPalette' })
      })
    },
    [possibleShortcutsSorted],
  )

  return (
    <div
      style={{
        ...(possibleShortcutsSorted.length > 0 ? { paddingLeft: '4em', paddingRight: '4em' } : null),
        marginBottom: fontSize,
        textAlign: 'left',
      }}
    >
      {show && possibleShortcutsSorted.length > 0 ? (
        <div>
          <h2
            style={{
              marginTop: 0,
              marginBottom: '1em',
              marginLeft: -fontSize * 1.8,
              paddingLeft: 5,
              borderBottom: 'solid 1px gray',
            }}
          >
            {showCommandPalette ? <CommandPalette onInput={setKeyboardInProgress} onSelect={onSelect} /> : 'Gestures'}
          </h2>

          {possibleShortcutsSorted.map((shortcut, i) => (
            <ShortcutGestureHint
              keyboardInProgress={keyboardInProgress}
              gestureInProgress={gestureInProgress}
              key={shortcut.id}
              selected={showCommandPalette ? i === 0 : gestureInProgress === shortcut.gesture}
              shortcut={shortcut}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>{GESTURE_CANCEL_ALERT_TEXT}</div>
      )}
    </div>
  )
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
            {alert?.alertType === AlertType.GestureHintExtended || showCommandPalette ? (
              <ExtendedGestureHint />
            ) : (
              children
            )}
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
      {...(alert && alert.alertType !== AlertType.GestureHintExtended ? useSwipeToDismissProps : null)}
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
        ...(alert && alert.alertType !== AlertType.GestureHintExtended ? useSwipeToDismissProps.style : null),
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
