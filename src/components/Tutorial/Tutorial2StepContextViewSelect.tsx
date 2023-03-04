import React from 'react'
import { isTouch } from '../../browser'
import { TUTORIAL_CONTEXT } from '../../constants'
import getContexts from '../../selectors/getContexts'
import store from '../../stores/app'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContextViewSelect = ({ tutorialChoice }: { tutorialChoice: keyof typeof TUTORIAL_CONTEXT }) => {
  const caseSensitiveValue =
    getContexts(store.getState(), TUTORIAL_CONTEXT[tutorialChoice]).length > 0
      ? TUTORIAL_CONTEXT[tutorialChoice]
      : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase()
  return (
    <>
      <p>Now I'm going to show you the {isTouch ? 'gesture' : 'keyboard shortcut'} to view multiple contexts.</p>
      <p>First select "{caseSensitiveValue}".</p>
    </>
  )
}

export default Tutorial2StepContextViewSelect
