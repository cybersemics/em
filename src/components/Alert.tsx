import React, { useState } from 'react'
import { connect, useDispatch } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import alertActionCreator from '../action-creators/alert'
import useSwipeToDismiss from '../hooks/useSwipeToDismiss'
import Alert from '../@types/Alert'
import State from '../@types/State'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = ({ alert }: State) => ({ alert })

/** An alert component with an optional closeLink that fades in and out. */
const AlertWithTransition = ({ alert }: ReturnType<typeof mapStateToProps>) => {
  const [isDismissed, setDismiss] = useState(false)
  const dispatch = useDispatch()

  /** Dismiss the alert on close. */
  const onClose = () => {
    setDismiss(true)
    dispatch(alertActionCreator(null))
  }

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup childFactory={child => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}>
      {alert ? (
        <CSSTransition key={0} timeout={800} classNames='fade' onEntering={() => setDismiss(false)}>
          {/* Specify a key to force the component to re-render and thus recalculate useSwipeToDismissProps when the alert changes. Otherwise the alert gets stuck off screen in the dismiss state. */}
          <AlertComponent alert={alert} onClose={onClose} key={alert.value} />
        </CSSTransition>
      ) : null}
    </TransitionGroup>
  )
}

/** The alert component itself. Separate so that a key property can be used to force a reset of useSwipeToDismissProps. */
const AlertComponent = ({ alert, onClose }: { alert: NonNullable<Alert>; onClose: () => void }) => {
  const dispatch = useDispatch()
  const useSwipeToDismissProps = useSwipeToDismiss({
    // dismiss after animation is complete to avoid touch events going to the Toolbar
    onDismissEnd: () => {
      dispatch(alertActionCreator(null))
    },
  })

  return (
    <div className={alert.isInline ? 'alert alert-inline' : 'alert'} {...useSwipeToDismissProps}>
      <span className='alert-text' dangerouslySetInnerHTML={{ __html: alert.value || '' }} />
      {alert.showCloseLink ? (
        <a className='upper-right status-close-x text-small' onClick={onClose}>
          ✕
        </a>
      ) : null}
    </div>
  )
}

export default connect(mapStateToProps)(AlertWithTransition)
