import React, { Fragment } from 'react'

import { TUTORIAL_CONTEXT, TUTORIAL_CONTEXT2_PARENT } from '../../constants'

import TutorialHint from './TutorialHint'
import { Text } from '../Text.native'
import { headValue } from '../../util'
import { commonStyles } from '../../style/commonStyles'
import { ThoughtId, Path } from '../../@types'
import { doStringsMatch } from '../../util/doStringsMatch'
import { useStore } from 'react-redux'
import { childIdsToThoughts } from '../../selectors'

type TutorialChoice = typeof TUTORIAL_CONTEXT

interface IComponentProps {
  cursor: Path
  rootChildren?: ThoughtId[]
  tutorialChoice: keyof TutorialChoice
}

const { smallText, italic } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
/**
 *
 */
const TutorialHintContainer = ({ cursor, tutorialChoice }: IComponentProps) => {
  const store = useStore()
  const cursorThought = childIdsToThoughts(store.getState(), cursor)

  return (
    <>
      <Text style={smallText}>Do you remember how to do it?</Text>
      <TutorialHint>
        {cursorThought &&
        cursorThought.length === 2 &&
        cursorThought[0].value === TUTORIAL_CONTEXT2_PARENT[tutorialChoice] ? (
          <Text style={smallText}>{`Type "${TUTORIAL_CONTEXT[tutorialChoice]}."`}</Text>
        ) : (
          <Text style={smallText}>
            {!cursor || headValue(store.getState(), cursor) !== TUTORIAL_CONTEXT2_PARENT[tutorialChoice]
              ? `Select "${TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}". `
              : null}
            Trace the line below with your finger to create a new thought{' '}
            <Text style={[smallText, italic]}>within</Text> "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}".
          </Text>
        )}
      </TutorialHint>
    </>
  )
}

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext2 = ({ tutorialChoice, rootChildren, cursor }: IComponentProps) => {
  const store = useStore()
  const children = (rootChildren && childIdsToThoughts(store.getState(), rootChildren)) ?? []
  return (
    <Fragment>
      <Text style={smallText}>
        Now add a thought with the text "{TUTORIAL_CONTEXT[tutorialChoice]}"{' '}
        <Text style={[smallText, italic]}>within</Text> “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}”.
      </Text>
      {
        // e.g. Work
        children.find(child => doStringsMatch(child.value, TUTORIAL_CONTEXT2_PARENT[tutorialChoice])) ? (
          <TutorialHintContainer cursor={cursor} tutorialChoice={tutorialChoice} />
        ) : (
          <Text style={smallText}>
            Oops, somehow “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}” was changed or deleted. Click the Prev button to
            go back.
          </Text>
        )
      }
    </Fragment>
  )
}
export default Tutorial2StepContext2
