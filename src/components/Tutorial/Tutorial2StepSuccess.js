import React, { Fragment } from 'react'
import { isMobile } from '../../browser'

const Tutorial2StepSuccess = ({ dispatch }) => <Fragment>
  <p>Congratulations! You have completed Part <span style={{ fontFamily: 'serif' }}>II </span> of the tutorial. You now have the skills to create a vast web of thoughts in <b>em</b>.</p>
  <p>That's right; you're on your own now. But you can always replay this tutorial or explore all of the available {isMobile ? 'gestures' : 'keyboard shortcuts'} by clicking the <a onClick={() => dispatch({ type: 'showModal', id: 'help' })}>Help</a> link in the footer.</p>
  <p>Happy Sensemaking!</p>
</Fragment>

export default Tutorial2StepSuccess
