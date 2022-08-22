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
import themeColors from '../selectors/themeColors'
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
  const colors = useSelector(themeColors)
  return (
    <div style={{ marginBottom: 10, position: 'relative', textAlign: 'left', ...style }}>
      <GestureDiagram
        size={size}
        path={gestureString(shortcut)}
        style={{ position: 'absolute', left: -size, top: -size / 4 }}
      />{' '}
      <div style={{ color: highlight ? colors.highlight : colors.fg }}>{shortcut.label}</div>
      {highlight && <div style={{ fontSize: '80%', marginBottom: '1em' }}>{shortcut.description}</div>}
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

  /** Render an extended gesture hint with embedded GestureDiagrams. Handled here to avoid creating a HOC or cause AppComponent to re-render too frequently. This could be separated into a HOC or hook if needed. */
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
            <div
              style={{
                ...(possibleShortcutsSorted.length > 0 ? { paddingLeft: '4em', paddingRight: '4em' } : null),
                marginBottom: fontSize,
                textAlign: 'left',
              }}
            >
              {possibleShortcutsSorted.length > 0 ? (
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
                    Gestures
                  </h2>

                  {possibleShortcutsSorted.map(shortcut => (
                    <ShortcutGestureHint
                      key={shortcut.id}
                      shortcut={shortcut}
                      size={fontSize * 2}
                      highlight={shortcut.gesture === sequence}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>✗ Cancel gesture</div>
              )}
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
    ...(alert.isInline ? { dx: '-50%' } : null),
    // dismiss after animation is complete to avoid touch events going to the Toolbar
    onDismissEnd: () => {
      dispatch(alertActionCreator(null))
    },
  })

  return (
    <div
      className='alert'
      {...(alert.alertType !== AlertType.GestureHintExtended ? useSwipeToDismissProps : null)}
      // merge style with useSwipeToDismissProps.style (transform, transition, and touchAction for sticking to user's touch)
      style={{
        overflowX: 'hidden',
        overflowY: 'auto',
        maxHeight: '100%',
        maxWidth: '100%',
        /* if inline, leave room on the left side so the user can click undo/redo */
        ...(alert.isInline ? { left: '50%', width: 'auto' } : null),
        ...(!children ? { textAlign: 'center' } : null),
        ...(alert.alertType !== AlertType.GestureHintExtended ? useSwipeToDismissProps.style : null),
      }}
    >
      <div
        className='alert-text'
        style={{ padding: '5px 10px' }}
        dangerouslySetInnerHTML={!children ? { __html: alert.value || '' } : undefined}
      >
        {children}
      </div>
      {alert.showCloseLink ? (
        <a className='upper-right status-close-x text-small' onClick={onClose}>
          ✕
        </a>
      ) : null}
    </div>
  )
}

export default connect(mapStateToProps)(AlertWithTransition)
