import React from 'react'
import { isTouch } from '../../browser'
import { TUTORIAL_CONTEXT } from '../../constants'
import getContexts from '../../selectors/getContexts'
import getSetting from '../../selectors/getSetting'
import { formatKeyboardShortcut, shortcutById } from '../../shortcuts'
import store from '../../stores/app'
import headValue from '../../util/headValue'

/** Returns true if the current tutorialStep is a hint. */
const isHint = () => {
  const tutorialStep = +getSetting(store.getState(), 'Tutorial Step')
  return tutorialStep !== Math.floor(tutorialStep)
}

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContextViewToggle = ({ cursor, tutorialChoice }) => {
  const caseSensitiveValue =
    getContexts(store.getState(), TUTORIAL_CONTEXT[tutorialChoice]).length > 0
      ? TUTORIAL_CONTEXT[tutorialChoice]
      : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase()
  return (
    <>
      {!cursor || headValue(store.getState(), cursor) !== caseSensitiveValue ? (
        <p>First select "{caseSensitiveValue}".</p>
      ) : (
        <>
          {isHint() ? (
            <p>
              You did the right gesture, but somehow "{caseSensitiveValue}" wasn't selected. Try
              {!cursor || headValue(store.getState(), cursor) !== caseSensitiveValue ? (
                <> selecting "{caseSensitiveValue}" and trying</>
              ) : null}{' '}
              again.
            </p>
          ) : null}
          <p>
            {isTouch
              ? 'Trace the line below'
              : `Hit ${formatKeyboardShortcut(shortcutById('toggleContextView').keyboard)}`}{' '}
            to view the current thought's contexts.
          </p>
        </>
      )}
    </>
  )
}

export default Tutorial2StepContextViewToggle
