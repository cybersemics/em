import React from 'react'
import { connect } from 'react-redux'

export const Status = connect(({ status, settings }) => ({ status, settings }))(({ status, settings }) =>
  settings.autologin ? <div className='status'>
    {status === 'disconnected' || status === 'connecting' ? <span>Connecting...</span> : null}
    {status === 'offline' ? <span className='error'>Offline</span> : null}
  </div> : null
)

