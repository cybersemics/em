import React, { Fragment } from 'react'
import { isMac, isMobile } from '../../browser'

import {
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT2_PARENT,
} from '../../constants'

import TutorialHint from './TutorialHint'

import {
  headValue,
} from '../../util'
const Tutorial2StepContext2 = ({ tutorialChoice, rootSubthoughts, cursor }) => <Fragment>
  <p>Now add a thought with the text "{TUTORIAL_CONTEXT[tutorialChoice]}" <i>within</i> “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}”.</p>
  {
    // e.g. Work
    rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase())
      ? <p>Do you remember how to do it?
        <TutorialHint>
          <br /><br />{cursor && cursor.length === 2 && cursor[0].value === TUTORIAL_CONTEXT2_PARENT[tutorialChoice]
            ? `Type "${TUTORIAL_CONTEXT[tutorialChoice]}."`
            : <Fragment>
              {!cursor || headValue(cursor) !== TUTORIAL_CONTEXT2_PARENT[tutorialChoice] ? `Select "${TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}". ` : null}
              {isMobile ? 'Trace the line below with your finger' : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter`} to create a new thought <i>within</i> "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}".
            </Fragment>
          }
        </TutorialHint>
      </p>
      : <p>Oops, somehow “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}” was changed or deleted. Click the Prev button to go back.</p>
  }
</Fragment>

export default Tutorial2StepContext2
