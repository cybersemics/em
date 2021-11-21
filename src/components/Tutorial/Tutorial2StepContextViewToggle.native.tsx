import React, { Fragment } from 'react'
import { store } from '../../store'

import { TUTORIAL_CONTEXT } from '../../constants'

import { headValue } from '../../util'

// selectors
import { getContexts, getSetting } from '../../selectors'

import { Path } from '../../@types'
import { Text } from '../Text.native'
import { commonStyles } from '../../style/commonStyles'
import { useStore } from 'react-redux'

type TutorialChoice = typeof TUTORIAL_CONTEXT

interface IComponentProps {
  cursor: Path
  tutorialChoice: keyof TutorialChoice
}

const { smallText } = commonStyles

/** Returns true if the current tutorialStep is a hint. */
const isHint = () => {
  const tutorialStep = +(getSetting(store.getState(), 'Tutorial Step') || 1)
  return tutorialStep !== Math.floor(tutorialStep)
}

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContextViewToggle = ({ cursor, tutorialChoice }: IComponentProps) => {
  const caseSensitiveValue =
    getContexts(store.getState(), TUTORIAL_CONTEXT[tutorialChoice]).length > 0
      ? TUTORIAL_CONTEXT[tutorialChoice]
      : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase()

  const state = useStore().getState()

  return (
    <Fragment>
      {!cursor || headValue(state, cursor) !== caseSensitiveValue ? (
        <Text style={smallText}>First select "{caseSensitiveValue}".</Text>
      ) : (
        <Fragment>
          {isHint() ? (
            <Text style={smallText}>
              You did the right gesture, but somehow "{caseSensitiveValue}" wasn't selected. Try
              {!cursor || headValue(state, cursor) !== caseSensitiveValue ? (
                <Text style={smallText}>selecting "{caseSensitiveValue}" and trying</Text>
              ) : null}{' '}
              again.
            </Text>
          ) : null}
          <Text style={smallText}>Trace the line below to view the current thought's contexts.</Text>
        </Fragment>
      )}
    </Fragment>
  )
}

export default Tutorial2StepContextViewToggle
