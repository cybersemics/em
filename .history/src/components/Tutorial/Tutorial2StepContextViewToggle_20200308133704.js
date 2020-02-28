import React, { Fragment } from 'react'
import { isMobile } from '../../browser'

import {
  TUTORIAL_CONTEXT,
} from '../../constants'

import {
  getContexts,
  headValue,
  getSetting
} from '../../util'

import {
  formatKeyboardShortcut,
  shortcutById,
} from '../../shortcuts'

/** Returns true if the current tutorialStep is a hint */
export const isHint = () => {
  const tutorialStep = +getSetting('Tutorial Step')[0]
  return tutorialStep !== Math.floor(tutorialStep)
}

export const Tutorial2StepContextViewToggle = ({ cursor, tutorialChoice }) => {
  const caseSensitiveValue = getContexts(TUTORIAL_CONTEXT[tutorialChoice]).length > 0
    ? TUTORIAL_CONTEXT[tutorialChoice]
    : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase()
  return <Fragment>
    {!cursor || headValue(cursor) !== caseSensitiveValue
      ? <p>First select "{caseSensitiveValue}".</p>
      : <Fragment>
        {isHint() ? <p>You did the right gesture, but somehow "{caseSensitiveValue}" wasn't selected. Try{!cursor || headValue(cursor) !== caseSensitiveValue ? <Fragment> selecting "{caseSensitiveValue}" and trying</Fragment> : null} again.</p> : null}
        <p>{isMobile ? 'Trace the line below' : `Hit ${formatKeyboardShortcut(shortcutById('toggleContextView').keyboard)}`} to view the current thought's contexts.</p>
      </Fragment>}
  </Fragment>
}
