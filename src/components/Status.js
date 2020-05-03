import React from 'react'
import { connect } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'

const mapStateToProps = ({ autologin, status }) => ({
  autologin,
  status,
})

const Status = ({ autologin, status }) =>
  autologin ? <div className='status'>
    <TransitionGroup>
      {status === 'disconnected' || status === 'connecting' ? <CSSTransition key={0} timeout={200} classNames='fade'><span>Connecting...</span></CSSTransition>
      // : status === 'loading' ? <CSSTransition key={0} timeout={200} classNames='fade'><span>Loading...</span></CSSTransition>
      : status === 'offline' ? <CSSTransition key={0} timeout={200} classNames='fade'><span className='offline'>Offline</span></CSSTransition>
      : null}
    </TransitionGroup>
  </div> : null

export default connect(mapStateToProps)(Status)
