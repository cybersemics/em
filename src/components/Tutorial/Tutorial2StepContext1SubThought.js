import React, { Fragment } from 'react'
import { isMac, isMobile } from '../../browser'

import {
  TUTORIAL_VERSION_TODO,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT
} from '../../constants'

import {
  getThoughtsRanked,
  headValue,
} from '../../util'

import TutorialHint from './TutorialHint'

import { context1SubthoughtCreated } from './TutorialUtils'

const Tutorial2StepContext1SubThought = ({ cursor, tutorialChoice, rootSubthoughts }) => {

  const context1SubthoughtisCreated = context1SubthoughtCreated({ rootSubthoughts, tutorialChoice })

  if (context1SubthoughtisCreated) {
    return (<Fragment>
      <p>Nice work!</p>
      <p>{isMobile ? 'Tap' : 'Click'} the Next button when you are done entering your thought.</p>
    </Fragment>)
  }
  return (<Fragment>
    <p>Now add a thought to “{TUTORIAL_CONTEXT[tutorialChoice]}”. {
      tutorialChoice === TUTORIAL_VERSION_TODO ? 'This could be any task you\'d like to get done.' :
        tutorialChoice === TUTORIAL_VERSION_JOURNAL ? 'This could be a specific person or a general thought about relationships.' :
          tutorialChoice === TUTORIAL_VERSION_BOOK ? 'You can just make up something about Psychology you could imagine hearing on a podcast.' :
            null
    }</p>
    {
      // e.g. Home
      rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) &&
        // e.g. Home/To Do
        getThoughtsRanked([TUTORIAL_CONTEXT1_PARENT[tutorialChoice]]).find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase())
        ? <p>Do you remember how to do it?
          <TutorialHint>
            <br /><br />
            {!cursor || headValue(cursor).toLowerCase() !== TUTORIAL_CONTEXT[tutorialChoice].toLowerCase() ? `Select "${TUTORIAL_CONTEXT[tutorialChoice]}". ` : null}
            {isMobile ? 'Trace the line below with your finger ' : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter `}
            to create a new thought <i>within</i> "{TUTORIAL_CONTEXT[tutorialChoice]}".
          </TutorialHint>
        </p>
        : <p>Oops, somehow “{TUTORIAL_CONTEXT[tutorialChoice]}” was changed or deleted. Click the Prev button to go back.</p>
    }
  </Fragment>)
}

export default Tutorial2StepContext1SubThought
