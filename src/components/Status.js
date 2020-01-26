import React from 'react'
import { connect } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'

export const Status = connect(({ status, settings }) => ({ status, autologin: settings.autologin }))(({ status, autologin }) =>
    autologin ? <div className='status'>
      <TransitionGroup>
        {status === 'disconnected' || status === 'connecting' ? <CSSTransition key={0} timeout={200} classNames='fade'><span>Connecting...</span></CSSTransition>
          // : status === 'loading' ? <CSSTransition key={0} timeout={200} classNames='fade'><span>Loading...</span></CSSTransition>
          : status === 'offline' ? <CSSTransition key={0} timeout={200} classNames='fade'><span className='offline'>Offline</span></CSSTransition>
          : null}
      </TransitionGroup>
    </div> : null
)
