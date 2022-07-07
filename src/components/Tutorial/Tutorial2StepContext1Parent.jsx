import React, { Fragment } from 'react'
import { useStore } from 'react-redux'
import { isTouch } from '../../browser'
import { TUTORIAL_CONTEXT1_PARENT } from '../../constants'
import ellipsize from '../../util/ellipsize'
import headValue from '../../util/headValue'
import joinConjunction from '../../util/joinConjunction'
import TutorialHint from './TutorialHint'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext1Parent = ({ cursor, tutorialChoice, rootChildren }) => {
  const store = useStore()

  return (
    <Fragment>
      <p>
        Let's begin! Create a new thought with the text “{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}”
        {cursor && headValue(store.getState(), cursor).startsWith('"') ? ' (without quotes)' : null}.
      </p>
      <p>
        You should create this thought at the top level, i.e. not <i>within</i> any other thoughts.
        <TutorialHint>
          <br />
          <br />
          {rootChildren.length > 0 && (!cursor || cursor.length > 1) ? (
            <Fragment>
              Select {rootChildren.length === 1 ? 'the top-level thought' : 'one of the top-level thoughts'} (
              {joinConjunction(
                rootChildren.map(child => `"${ellipsize(child.value)}"`),
                'or',
              )}
              ).{' '}
            </Fragment>
          ) : null}
          {isTouch ? 'Trace the line below with your finger' : 'Hit the Enter key'} to create a new thought. Then type "
          {TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}".
        </TutorialHint>
      </p>
    </Fragment>
  )
}

export default Tutorial2StepContext1Parent
