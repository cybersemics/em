import React, { useState } from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { alert } from '../action-creators'
import useSwipeToDismiss from '../hooks/useSwipeToDismiss'
import { Alert, State } from '../@types'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = ({ alert }: State) => ({ alert })

// eslint-disable-next-line jsdoc/require-jsdoc
const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  close: () => {
    dispatch(alert(null))
  },
})

type AlertComponentProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>

/** An alert component with an optional closeLink that fades in and out. */
const AlertWithTransition = ({ alert, close }: AlertComponentProps) => {
  const [isDismissed, setDismiss] = useState(false)

  /** Handle alert close. */
  const handleClose = () => {
    setDismiss(true)
    close()
  }

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup childFactory={child => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}>
      {alert ? (
        <CSSTransition key={0} timeout={800} classNames='fade' onEntering={() => setDismiss(false)}>
          {/* Specify a key to force the component to re-render and thus recalculate useSwipeToDismissProps when the alert changes. Otherwise the alert gets stuck off screen in the dismiss state. */}
          <AlertComponent alert={alert} onClose={handleClose} key={alert.value} />
        </CSSTransition>
      ) : null}
    </TransitionGroup>
  )
}

/** The alert component itself. Separate so that a key property can be used to force a reset of useSwipeToDismissProps. */
const AlertComponent = ({ alert, onClose }: { alert: NonNullable<Alert>; onClose: () => void }) => {
  const useSwipeToDismissProps = useSwipeToDismiss({ onDismiss: onClose })

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

export default connect(mapStateToProps, mapDispatchToProps)(AlertWithTransition)
