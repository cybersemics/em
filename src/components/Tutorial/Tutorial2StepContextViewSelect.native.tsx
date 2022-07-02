import React, { Fragment } from 'react'
import { TUTORIAL_CONTEXT } from '../../constants'
import getContexts from '../../selectors/getContexts'
import { store } from '../../store'
import { commonStyles } from '../../style/commonStyles'
import { Text } from '../Text.native'

type TutorialChoice = typeof TUTORIAL_CONTEXT

interface IComponentProps {
  tutorialChoice: keyof TutorialChoice
}

const { smallText } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContextViewSelect = ({ tutorialChoice }: IComponentProps) => {
  const caseSensitiveValue =
    getContexts(store.getState(), TUTORIAL_CONTEXT[tutorialChoice]).length > 0
      ? TUTORIAL_CONTEXT[tutorialChoice]
      : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase()
  return (
    <Fragment>
      <Text style={smallText}>Now I'm going to show you the gesture to view multiple contexts.</Text>
      <Text style={smallText}>First select "{caseSensitiveValue}".</Text>
    </Fragment>
  )
}

export default Tutorial2StepContextViewSelect
