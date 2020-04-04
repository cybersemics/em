import React from 'react'
import { connect } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import createAlert from '../action-creators/alert'

const mapStateToProps = ({ alert }) => ({ alert })

const Alert = ({ alert, dispatch }) =>
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

export default connect(mapStateToProps)(Alert)
