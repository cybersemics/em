import React, { Fragment } from 'react'
import { useStore } from 'react-redux'
import { isTouch } from '../../browser'
import { TUTORIAL_CONTEXT, TUTORIAL_CONTEXT1_PARENT, TUTORIAL_CONTEXT2_PARENT } from '../../constants'
import headValue from '../../util/headValue'
import TutorialHint from './TutorialHint'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext2Parent = ({ tutorialChoice, cursor }) => {
  const tutorialChoiceMap = {
    TUTORIAL_VERSION_TODO: null,
    TUTORIAL_VERSION_JOURNAL: 'You probably talk about relationships in therapy. ',
    TUTORIAL_VERSION_BOOK: 'This time imagine reading a book about Psychology. ',
  }

  const store = useStore()

  return (
    <Fragment>
      <p>Now we are going to create a different "{TUTORIAL_CONTEXT[tutorialChoice]}" list.</p>
      <p>
        {tutorialChoiceMap[tutorialChoice] || null}
        Create a new thought with the text “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}”
        {cursor && headValue(store.getState(), cursor).startsWith('"') ? ' (without quotes)' : null} <i>after</i> "
        {TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}" (but at the same level).
        <TutorialHint>
          <br />
          <br />
          {!cursor ||
          headValue(store.getState(), cursor).toLowerCase() !==
            TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase() ? (
            <Fragment>Select "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}." </Fragment>
          ) : (
            <Fragment>
              {isTouch ? 'Trace the line below with your finger' : 'Hit the Enter key'} to create a new thought{' '}
              <i>after</i> "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". Then type "
              {TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}".
            </Fragment>
          )}
        </TutorialHint>
      </p>
    </Fragment>
  )
}

export default Tutorial2StepContext2Parent
