import React from 'react'
import { connect } from 'react-redux'

// constants
import {
  TUTORIAL_STEP_END,
} from '../constants.js'

/** A close button to cancel the inline tutorial. */
export const CancelTutorial = connect(({ settings }) => ({ settings }))(({ settings, dispatch }) =>
  settings.tutorialStep < TUTORIAL_STEP_END ? <div className='status'>
    <a className='status-button' onClick={() => dispatch({ type: 'endTutorial' }) }>✕ skip tutorial</a>
  </div> : null
)

