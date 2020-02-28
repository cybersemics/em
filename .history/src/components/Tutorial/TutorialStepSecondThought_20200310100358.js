import React, { Fragment } from 'react'
import { isMobile } from '../../browser'
import { TutorialHint } from './TutorialHint'

const TutorialStepSecondThought = () => (<Fragment>
  <p>Well done!</p>
  <p>Try adding another thought. Do you remember how to do it?
    <TutorialHint>
      <br /><br />{isMobile ? 'Trace the line below with your finger' : 'Hit the Enter key'} to create a new thought.
    </TutorialHint>
  </p>
</Fragment>)

export default TutorialStepSecondThought
