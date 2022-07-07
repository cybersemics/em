import React, { Fragment } from 'react'
import { useStore } from 'react-redux'
import Path from '../../@types/Path'
import State from '../../@types/State'
import { TUTORIAL_CONTEXT, TUTORIAL_CONTEXT1_PARENT, TUTORIAL_CONTEXT2_PARENT } from '../../constants'
import { commonStyles } from '../../style/commonStyles'
import headValue from '../../util/headValue'
import { Text } from '../Text.native'
import TutorialHint from './TutorialHint'

type TutorialChoice = typeof TUTORIAL_CONTEXT1_PARENT

interface IComponentProps {
  cursor: Path
  tutorialChoice: keyof TutorialChoice
}

const { smallText, italic } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext2Parent = ({ tutorialChoice, cursor }: IComponentProps) => {
  const tutorialChoiceMap = {
    TUTORIAL_VERSION_TODO: null,
    TUTORIAL_VERSION_JOURNAL: 'You probably talk about relationships in therapy. ',
    TUTORIAL_VERSION_BOOK: 'This time imagine reading a book about Psychology. ',
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const selectedTutorial = tutorialChoiceMap[tutorialChoice] || null

  const state = useStore<State>().getState()

  return (
    <Fragment>
      <Text style={smallText}>Now we are going to create a different "{TUTORIAL_CONTEXT[tutorialChoice]}" list.</Text>
      <Text style={smallText}>
        {selectedTutorial}
        Create a new thought with the text “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}”
        {cursor && headValue(state, cursor).startsWith('"') ? ' (without quotes)' : null}{' '}
        <Text style={[smallText, italic]}>after</Text> "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}" (but at the same
        level).
      </Text>
      <TutorialHint>
        <>
          {!cursor ||
          headValue(state, cursor).toLowerCase() !== TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase() ? (
            <Text style={smallText}>Select "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}." </Text>
          ) : (
            <Text style={smallText}>
              'Trace the line below with your finger to create a new thought{' '}
              <Text style={[smallText, italic]}>after</Text> "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". Then type "
              {TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}".
            </Text>
          )}
        </>
      </TutorialHint>
    </Fragment>
  )
}

export default Tutorial2StepContext2Parent
