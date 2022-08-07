import _ from 'lodash'
import React, { FC, useState } from 'react'
import { connect, useDispatch, useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import Alert from '../@types/Alert'
import Shortcut from '../@types/Shortcut'
import State from '../@types/State'
import alertActionCreator from '../action-creators/alert'
import setAttribute from '../action-creators/setAttribute'
import GestureDiagram from '../components/GestureDiagram'
import { AlertType, EM_TOKEN } from '../constants'
import useSwipeToDismiss from '../hooks/useSwipeToDismiss'
import theme from '../selectors/theme'
import { globalShortcuts } from '../shortcuts'

interface AlertProps {
  alert: NonNullable<Alert>
  onClose: () => void
}

/** Gets the canonical gesture of the shortcut as a string, ignoring aliases. Returns an empty string if the shortcut does not have a gesture. */
const gestureString = (shortcut: Shortcut): string =>
  (typeof shortcut.gesture === 'string' ? shortcut.gesture : shortcut.gesture?.[0] || '') as string

/** Renders a GestureDiagram and its label as a hint during a MultiGesture. */
const ShortcutGestureHint = ({
  highlight,
  shortcut,
  size,
  style,
}: {
  highlight: boolean
  shortcut: Shortcut
  size: number
  style?: React.CSSProperties
}) => {
  const dark = useSelector((state: State) => theme(state) !== 'Light')
  return (
    <div style={{ marginBottom: 10, position: 'relative', textAlign: 'left', ...style }}>
      <GestureDiagram
        size={size}
        path={gestureString(shortcut)}
        style={{ position: 'absolute', left: -size, top: -size / 4 }}
      />{' '}
      <div style={{ color: dark ? (highlight ? 'lightblue' : 'white') : highlight ? 'royalblue' : 'black' }}>
        {shortcut.label}
      </div>
      {highlight && (
        <div style={{ fontSize: '80%', marginBottom: '1em', width: 'calc(100% - 10em)' }}>{shortcut.description}</div>
      )}
    </div>
  )
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = ({ alert }: State) => ({ alert })

/** An alert component with an optional closeLink that fades in and out. */
const AlertWithTransition: FC<{ alert?: Alert }> = ({ alert, children }) => {
  const [isDismissed, setDismiss] = useState(false)
  const dispatch = useDispatch()
  const fontSize = useSelector((state: State) => state.fontSize)

  /** Dismiss the alert on close. */
  const onClose = () => {
    setDismiss(true)
    dispatch([
      alertActionCreator(null),
      // dismiss SpaceToIndentHint flag
      // TODO: Factor out into setEmThought
      alert?.alertType === AlertType.SpaceToIndentHint
        ? setAttribute({ path: [EM_TOKEN], values: ['=flags', 'spaceToIndentHintComplete'] })
        : null,
    ])
  }

  /** Render the gesture hint with embedded GestureDiagrams. Handled here to avoid creating a HOC or cause AppComponent to re-render too frequently. This could be separated into a HOC or hook if needed. */
  const GestureHint =
    alert?.alertType === AlertType.GestureHintExtended
      ? () => {
          const sequence = alert.value === '*' ? '' : alert.value!

          // get the shortcuts that can be executed with the current sequence
          const possibleShortcuts = globalShortcuts.filter(
            shortcut =>
              !shortcut.hideFromInstructions && shortcut.gesture && gestureString(shortcut).startsWith(sequence),
          )
          const possibleShortcutsSorted = _.sortBy(
            possibleShortcuts,
            shortcut => `${shortcut.gesture!.length}\x00${shortcut.label}`,
          )
          return (
            <div style={{ marginBottom: fontSize * 2 }}>
              <div
                style={{
                  marginLeft: -fontSize * 2,
                  marginBottom: 12,
                  paddingLeft: 5,
                  borderBottom: 'solid 1px gray',
                  width: `calc(50% + ${fontSize * 2}px)`,
                }}
              >
                Gestures
              </div>
              {possibleShortcutsSorted.length > 0
                ? possibleShortcutsSorted.map(shortcut => (
                    <ShortcutGestureHint
                      key={shortcut.id}
                      shortcut={shortcut}
                      size={fontSize * 2}
                      highlight={shortcut.gesture === sequence}
                    />
                  ))
                : '✗ Cancel gesture'}
            </div>
          )
        }
      : null

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup childFactory={child => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}>
      {alert ? (
        <CSSTransition key={0} timeout={800} classNames='fade' onEntering={() => setDismiss(false)}>
          {/* Specify a key to force the component to re-render and thus recalculate useSwipeToDismissProps when the alert changes. Otherwise the alert gets stuck off screen in the dismiss state. */}
          <AlertComponent alert={alert} onClose={onClose} key={alert.value}>
            {GestureHint?.() || children}
          </AlertComponent>
        </CSSTransition>
      ) : null}
    </TransitionGroup>
  )
}

/** The alert component itself. Separate so that a key property can be used to force a reset of useSwipeToDismissProps. */
const AlertComponent: FC<AlertProps> = ({ alert, onClose, children }) => {
  const dispatch = useDispatch()
  const useSwipeToDismissProps = useSwipeToDismiss({
    // dismiss after animation is complete to avoid touch events going to the Toolbar
    onDismissEnd: () => {
      dispatch(alertActionCreator(null))
    },
  })

  return (
    <div
      className={alert.isInline ? 'alert alert-inline' : 'alert'}
      {...(alert.alertType !== AlertType.GestureHintExtended ? useSwipeToDismissProps : null)}
      // merge style with useSwipeToDismissProps.style (transform, transition, and touchAction for sticking to user's touch)
      style={{
        overflowX: 'hidden',
        overflowY: 'auto',
        maxHeight: '100%',
        maxWidth: '100%',
        ...(alert.alertType !== AlertType.GestureHintExtended ? useSwipeToDismissProps.style : null),
        ...(!children ? { textAlign: 'center' } : null),
      }}
    >
      <span
        className='alert-text'
        style={{
          ...(alert.alertType === AlertType.GestureHintExtended ? { paddingLeft: '6em', width: '100%' } : null),
        }}
        dangerouslySetInnerHTML={!children ? { __html: alert.value || '' } : undefined}
      >
        {children}
      </span>
      {alert.showCloseLink ? (
        <a className='upper-right status-close-x text-small' onClick={onClose}>
          ✕
        </a>
      ) : null}
    </div>
  )
}

export default connect(mapStateToProps)(AlertWithTransition)
