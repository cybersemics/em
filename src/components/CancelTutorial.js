import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'

// constants
import {
  TUTORIAL_STEP3_DELETE,
  TUTORIAL_STEP4_END,
} from '../constants.js'

/** A close button to cancel the inline tutorial. */
export const CancelTutorial = connect(({ settings }) => ({ settings }))(({ settings, dispatch }) =>
  settings.tutorialStep < TUTORIAL_STEP4_END ? <div className='status'>
    <a className={classNames({
      'status-button': true,
      'status-button-fade': settings.tutorialStep === TUTORIAL_STEP3_DELETE
    })} onClick={() => dispatch({ type: 'deleteTutorial' }) }>✕ skip tutorial</a>
  </div> : null
)

