import React, { Fragment } from 'react'
import { useStore } from 'react-redux'
import Path from '../../@types/Path'
import State from '../../@types/State'
import Thought from '../../@types/Thought'
import { isMac, isTouch } from '../../browser'
import {
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_TODO,
} from '../../constants'
import { commonStyles } from '../../style/commonStyles'
import doStringsMatch from '../../util/doStringsMatch'
import headValue from '../../util/headValue'
import { Text } from '../Text.native'
import TutorialHint from './TutorialHint'

type TutorialChoice = typeof TUTORIAL_CONTEXT1_PARENT

interface IComponentProps {
  cursor: Path
  rootChildren: Thought[]
  tutorialChoice: keyof TutorialChoice
}

const { smallText, italic } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext1 = ({ cursor, tutorialChoice, rootChildren }: IComponentProps) => {
  const { getState } = useStore<State>()
  const state = getState()

  return (
    <Fragment>
      <Text style={smallText}>
        Let's say that{' '}
        {tutorialChoice === TUTORIAL_VERSION_TODO
          ? 'you want to make a list of things you have to do at home.'
          : tutorialChoice === TUTORIAL_VERSION_JOURNAL
          ? 'one of the themes in your journal is "Relationships".'
          : tutorialChoice === TUTORIAL_VERSION_BOOK
          ? `you hear a podcast on ${TUTORIAL_CONTEXT[tutorialChoice]}.`
          : null}{' '}
        Add a thought with the text "{TUTORIAL_CONTEXT[tutorialChoice]}" <Text style={[smallText, italic]}>within</Text>{' '}
        “{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}”.
      </Text>
      {rootChildren.find(child => doStringsMatch(child.value, TUTORIAL_CONTEXT1_PARENT[tutorialChoice])) ? (
        <Text style={smallText}>
          Do you remember how to do it?
          <TutorialHint>
            <Text style={smallText}>
              {!cursor ||
              headValue(state, cursor).toLowerCase() !== TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()
                ? `Select "${TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". `
                : null}
              {isTouch ? 'Trace the line below with your finger' : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter`}{' '}
              to create a new thought <Text style={[smallText, italic]}>within</Text> "
              {TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". Then type "{TUTORIAL_CONTEXT[tutorialChoice]}".
            </Text>
          </TutorialHint>
        </Text>
      ) : (
        <Text style={smallText}>
          Oops, somehow “{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}” was changed or deleted. Click the Prev button to go
          back.
        </Text>
      )}
    </Fragment>
  )
}

export default Tutorial2StepContext1
