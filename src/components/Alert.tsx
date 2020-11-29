import React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { State } from '../util/initialState'
import { alert } from '../action-creators'
import { Alert } from '../types'

interface AlertDispatchToProps {
  createAlert: (text: string | null) => void,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = ({ alert }: State) => ({ alert })

// eslint-disable-next-line jsdoc/require-jsdoc
const mapDispatchToProps = (dispatch: Dispatch<any>): AlertDispatchToProps => ({
  createAlert: (text: string | null) => dispatch(alert(text)),
})

/** An alert component with an optional closeLink. */
const AlertComponent = ({ alert, createAlert }: { alert?: Alert, createAlert: (text: string | null) => void }) =>
  <TransitionGroup>
    {alert
      ? <CSSTransition key={0} timeout={200} classNames='fade'>
        <div className='alert'>
          <span className='alert-text'>{alert.value}</span>
          {alert.showCloseLink ? <a className='upper-right status-close-x text-small' onClick={() => createAlert(null)}>✕</a> : null}
        </div>
      </CSSTransition>
      : null}
  </TransitionGroup>

export default connect(mapStateToProps, mapDispatchToProps)(AlertComponent)
