import React from 'react'
import globals from '../globals'

/** A higher-order component that monitors whether the user is touching the screen or not. */
const TouchMonitor = ({ children }) =>
  <div onTouchMove={
    () => globals.touching = true // eslint-disable-line no-return-assign
  } onTouchEnd={() => {
    globals.touching = false // eslint-disable-line no-return-assign
    globals.touched = true // eslint-disable-line no-return-assign
  }}>
    {children}
  </div>

export default TouchMonitor
