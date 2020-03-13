import React, { Fragment } from 'react'
import { isMobile } from '../../browser'

const TutorialStepFirstThought = () => (<Fragment>
  <p>First, let me show you how to create a new thought in <b>em</b> using a {isMobile ? 'gesture' : 'keyboard shortcut'}.
  Just follow the instructions; this tutorial will stay open.</p>
  <p>{isMobile ? 'Trace the line below with your finger' : 'Hit the Enter key'} to create a new thought.</p>
</Fragment>)

export default TutorialStepFirstThought
