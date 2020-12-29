import React, { Fragment } from 'react'
import { isTouch } from '../../browser'
import { showModal } from '../../action-creators'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepSuccess = ({ dispatch }) => <Fragment>
  <p>Congratulations! You have completed Part II of the tutorial. You now have the skills to create a vast web of thoughts in <b>em</b>.</p>
  <p>That's right; you're on your own now. But you can always replay this tutorial or explore all of the available {isTouch ? 'gestures' : 'keyboard shortcuts'} by clicking the <a onClick={() => dispatch(showModal({ id: 'help' }))}>Help</a> link in the footer.</p>
  <p>Happy Sensemaking!</p>
</Fragment>

export default Tutorial2StepSuccess
