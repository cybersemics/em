import classNames from 'classnames'
import React, { FC, useCallback, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { alertActionCreator } from '../actions/alert'
import { AlertType } from '../constants'
import { isUndoEnabled } from '../selectors/isUndoEnabled'
import redoShortcut from '../shortcuts/redo'
import undoShortcut from '../shortcuts/undo'
import alertStore from '../stores/alert'
import store from '../stores/app'
import fastClick from '../util/fastClick'
import Popup from './Popup'
import RedoIcon from './RedoIcon'
import UndoIcon from './UndoIcon'

/** An alert component that fades in and out. */
const Alert: FC = () => {
  const popupRef = useRef<HTMLDivElement>(null)
  const [isDismissed, setDismiss] = useState(false)
  const dispatch = useDispatch()
  const alert = useSelector(state => state.alert)
  const alertStoreValue = alertStore.useState()
  const value = alertStoreValue ?? alert?.value
  const undoEnabled = useSelector(isUndoEnabled)
  const redoEnabled = useSelector(state => state.redoPatches.length > 0)

  /** Dismiss the alert on close. */
  const onClose = useCallback(() => {
    if (!alert?.showCloseLink) return
    setDismiss(true)
    dispatch(alertActionCreator(null))
  }, [alert, dispatch])

  const undoOrRedo = alert?.alertType === AlertType.Undo || alert?.alertType === AlertType.Redo
  const buttons = undoOrRedo ? (
    <div style={{ marginTop: '0.5em' }}>
      <a
        className={classNames('button button-small', { disabled: !undoEnabled })}
        style={{ margin: '0.25em' }}
        {...fastClick(e => {
          undoShortcut.exec(dispatch, store.getState, e, { type: 'toolbar' })
        })}
      >
        <UndoIcon fill='black' style={{ position: 'relative', top: '0.25em', right: '0.25em' }} />
        Undo
      </a>
      <a
        className={classNames('button button-small', { disabled: !redoEnabled })}
        style={{ margin: '0.25em' }}
        {...fastClick(e => {
          redoShortcut.exec(dispatch, store.getState, e, { type: 'toolbar' })
        })}
      >
        Redo
        <RedoIcon fill='black' style={{ position: 'relative', top: '0.25em', left: '0.25em' }} />
      </a>
    </div>
  ) : null

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup
      childFactory={(child: React.ReactElement) => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}
    >
      {alert ? (
        <CSSTransition
          key={0}
          nodeRef={popupRef}
          timeout={800}
          classNames='fade-slow-out'
          onEntering={() => setDismiss(false)}
        >
          {/* Specify a key to force the component to re-render and thus recalculate useSwipeToDismissProps when the alert changes. Otherwise the alert gets stuck off screen in the dismiss state. */}
          <Popup {...alert} ref={popupRef} onClose={onClose} key={value}>
            {value}
            {buttons}
          </Popup>
        </CSSTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default Alert
