import React, { Fragment } from 'react'
import TutorialHint from './TutorialHint'
import {
  isMobile, isMac
} from '../../browser'
import { headValue } from '../../util'

import {
  TUTORIAL_VERSION_TODO,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT
} from '../../constants'

const Tutorial2StepContext1 = ({ cursor, tutorialChoice, rootSubthoughts }) => (<Fragment>
  <p>Let's say that {
    tutorialChoice === TUTORIAL_VERSION_TODO ? 'you want to make a list of things you have to do at home.' :
      tutorialChoice === TUTORIAL_VERSION_JOURNAL ? 'one of the themes in your journal is "Relationships".' :
        tutorialChoice === TUTORIAL_VERSION_BOOK ? `you hear a podcast on ${TUTORIAL_CONTEXT[tutorialChoice]}.` :
          null
  } Add a thought with the text "{TUTORIAL_CONTEXT[tutorialChoice]}" <i>within</i> “{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}”.</p>
  {rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase())
    ? <p>Do you remember how to do it?
      <TutorialHint>
        <br /><br />{!cursor || headValue(cursor).toLowerCase() !== TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase() ? `Select "${TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". ` : null}{isMobile ? 'Trace the line below with your finger' : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter`} to create a new thought <i>within</i> "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". Then type "{TUTORIAL_CONTEXT[tutorialChoice]}".
      </TutorialHint>
    </p>
    : <p>Oops, somehow “{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}” was changed or deleted. Click the Prev button to go back.</p>
  }
</Fragment>)

export default Tutorial2StepContext1
