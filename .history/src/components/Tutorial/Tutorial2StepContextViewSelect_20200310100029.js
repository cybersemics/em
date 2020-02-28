import React, { Fragment } from 'react'
import { isMobile } from '../../browser'

import {
  TUTORIAL_CONTEXT,
} from '../../constants'

import {
  getContexts,
} from '../../util'

const Tutorial2StepContextViewSelect = ({ tutorialChoice }) => {
  const caseSensitiveValue = getContexts(TUTORIAL_CONTEXT[tutorialChoice]).length > 0
    ? TUTORIAL_CONTEXT[tutorialChoice]
    : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase()
  return <Fragment>
    <p>Now I'm going to show you the {isMobile ? 'gesture' : 'keyboard shortcut'} to view multiple contexts.</p>
    <p>First select "{caseSensitiveValue}".</p>
  </Fragment>
}

export default Tutorial2StepContextViewSelect
