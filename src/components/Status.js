import React from 'react'
import { connect } from 'react-redux'

export const Status = connect(({ status, settings }) => ({ status, autologin: settings.autologin }))(({ status, autologin }) =>
  autologin ? <div className='status'>
    {status === 'disconnected' || status === 'connecting' ? <span>Connecting...</span>
      : status === 'loading' ? <span>Loading...</span>
      : null}
    {status === 'offline' ? <span className='offline'>Offline</span> : null}
  </div> : null
)
