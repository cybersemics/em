import React, { FC, useCallback, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { alertActionCreator } from '../actions/alert'
import alertStore from '../stores/alert'
import Popup from './Popup'

/** An alert component that fades in and out. */
const Alert: FC = () => {
  const popupRef = useRef<HTMLDivElement>(null)
  const [isDismissed, setDismiss] = useState(false)
  const dispatch = useDispatch()
  const alert = useSelector(state => state.alert)
  const alertStoreValue = alertStore.useState()
  const value = alertStoreValue ?? alert?.value

  /** Dismiss the alert on close. */
  const onClose = useCallback(() => {
    if (!alert?.showCloseLink) return
    setDismiss(true)
    dispatch(alertActionCreator(null))
  }, [alert, dispatch])

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
          </Popup>
        </CSSTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default Alert
