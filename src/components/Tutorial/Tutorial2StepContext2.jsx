import React, { Fragment } from 'react'
import { isMac, isTouch } from '../../browser'

import { TUTORIAL_CONTEXT, TUTORIAL_CONTEXT2_PARENT } from '../../constants'

import TutorialHint from './TutorialHint'

import { headValue } from '../../util'
import { useStore } from 'react-redux'
import { childIdsToThoughts } from '../../selectors'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext2 = ({ tutorialChoice, rootChildren, cursor }) => {
  const store = useStore()
  const cursorThought = childIdsToThoughts(store.getState(), cursor)

  return (
    <Fragment>
      <p>
        Now add a thought with the text "{TUTORIAL_CONTEXT[tutorialChoice]}" <i>within</i> “
        {TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}”.
      </p>
      {
        // e.g. Work
        rootChildren.find(
          child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase(),
        ) ? (
          <p>
            Do you remember how to do it?
            <TutorialHint>
              <br />
              <br />
              {cursorThought &&
              cursorThought.length === 2 &&
              cursorThought[0].value === TUTORIAL_CONTEXT2_PARENT[tutorialChoice] ? (
                `Type "${TUTORIAL_CONTEXT[tutorialChoice]}."`
              ) : (
                <Fragment>
                  {!cursor || headValue(store.getState(), cursor) !== TUTORIAL_CONTEXT2_PARENT[tutorialChoice]
                    ? `Select "${TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}". `
                    : null}
                  {isTouch
                    ? 'Trace the line below with your finger'
                    : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter`}{' '}
                  to create a new thought <i>within</i> "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}".
                </Fragment>
              )}
            </TutorialHint>
          </p>
        ) : (
          <p>
            Oops, somehow “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}” was changed or deleted. Click the Prev button to
            go back.
          </p>
        )
      }
    </Fragment>
  )
}

export default Tutorial2StepContext2
