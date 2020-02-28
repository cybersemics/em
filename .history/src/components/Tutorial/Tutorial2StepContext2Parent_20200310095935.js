import React, { Fragment } from 'react'
import { isMobile } from '../../browser'

import {
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT
} from '../../constants'

import { TutorialHint } from './TutorialHint'

import {
  headValue,
} from '../../util'

const Tutorial2StepContext2Parent = ({ tutorialChoice, cursor }) => {

  const tutorialChoiceMap = {
    TUTORIAL_VERSION_TODO: null,
    TUTORIAL_VERSION_JOURNAL: 'You probably talk about relationships in therapy. ',
    TUTORIAL_VERSION_BOOK: 'This time imagine reading a book about Psychology. '
  }
  return (<Fragment>
    <p>Now we are going to create a different "{TUTORIAL_CONTEXT[tutorialChoice]}" list.</p>
    <p>
      {tutorialChoiceMap[tutorialChoice] || null}
      Create a new thought with the text “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}”{cursor && headValue(cursor).startsWith('"') ? ' (without quotes)' : null} <i>after</i> "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}" (but at the same level).
      <TutorialHint>
        <br /><br />{
          !cursor || headValue(cursor).toLowerCase() !== TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()
            ? <Fragment>Select "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}." </Fragment>
            : <Fragment>{isMobile ? 'Trace the line below with your finger' : `Hit the Enter key`} to create a new thought <i>after</i> "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". Then type "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}".</Fragment>
        }
      </TutorialHint>
    </p>
  </Fragment>)
}

export default Tutorial2StepContext2Parent
