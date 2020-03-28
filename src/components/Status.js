import React from 'react'
import { connect } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'

// constants
import {
  EM_TOKEN,
} from '../constants.js'

import {
  meta,
} from '../util.js'

const mapStateToProps = ({ status }) => ({
  autologin: meta([EM_TOKEN, 'Settings', 'Autologin']).On,
  status,
})

const Status = connect(mapStateToProps)(({ status, autologin }) =>
  autologin ? <div className='status'>
    <TransitionGroup>
      {status === 'disconnected' || status === 'connecting' ? <CSSTransition key={0} timeout={200} classNames='fade'><span>Connecting...</span></CSSTransition>
      // : status === 'loading' ? <CSSTransition key={0} timeout={200} classNames='fade'><span>Loading...</span></CSSTransition>
        : status === 'offline' ? <CSSTransition key={0} timeout={200} classNames='fade'><span className='offline'>Offline</span></CSSTransition>
          : null}
    </TransitionGroup>
  </div> : null
)

export default Status
