import React from 'react'
import { connect } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { alertAction } from '../actions'

export const Alert = connect(({ alert }) => ({ alert }), { alertAction })(({ alert }) =>
  <TransitionGroup>
    {alert
      ? <CSSTransition key={0} timeout={200} classNames='fade'>
        <div className='alert'>
          <span className='alert-text'>{alert.value}</span>
          {alert.x ? <a className='upper-right status-x text-small' onClick={alertAction}>✕</a> : null}
        </div>
      </CSSTransition>
    : null}
  </TransitionGroup>
)
