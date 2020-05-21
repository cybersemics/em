import React, { Fragment } from 'react'
import TutorialHint from './TutorialHint'
import {
  isMobile,
} from '../../browser'

import {
  ellipsize,
  headValue,
  joinConjunction,
} from '../../util'

import {
  TUTORIAL_CONTEXT1_PARENT,
} from '../../constants'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext1Parent = ({ cursor, tutorialChoice, rootSubthoughts }) => <Fragment>
  <p>Let's begin! Create a new thought with the text “{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}”{cursor && headValue(cursor).startsWith('"') ? ' (without quotes)' : null}.</p>
  <p>You should create this thought at the top level, i.e. not <i>within</i> any other thoughts.
    <TutorialHint>
      <br /><br />{
        rootSubthoughts.length > 0 && (!cursor || cursor.length > 1)
          ? <Fragment>Select {rootSubthoughts.length === 1 ? 'the top-level thought' : 'one of the top-level thoughts'} ({joinConjunction(rootSubthoughts.map(child => `"${ellipsize(child.value)}"`), 'or')}). </Fragment>
          : null
      }{isMobile ? 'Trace the line below with your finger' : `Hit the Enter key`} to create a new thought. Then type "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}".
    </TutorialHint>
  </p>
</Fragment>

export default Tutorial2StepContext1Parent
