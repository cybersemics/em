import React, { Fragment } from 'react'
import { store } from '../../store'

import {
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_TODO,
} from '../../constants'
import { headValue } from '../../util'
import { getChildrenRanked } from '../../selectors'

import TutorialHint from './TutorialHint'
import { context1SubthoughtCreated } from './TutorialUtils'
import { Child, Path } from '../../@types'
import { Text } from '../Text.native'
import { commonStyles } from '../../style/commonStyles'

type TutorialChoice = typeof TUTORIAL_CONTEXT1_PARENT

interface IComponentProps {
  cursor: Path
  rootChildren: Child[]
  tutorialChoice: keyof TutorialChoice
}

const { smallText, italic } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext1SubThought = ({ cursor, tutorialChoice, rootChildren }: IComponentProps) => {
  const context1SubthoughtisCreated = context1SubthoughtCreated({ rootChildren, tutorialChoice })

  if (context1SubthoughtisCreated) {
    return (
      <Fragment>
        <Text style={smallText}>Nice work!</Text>
        <Text style={smallText}>Tap the Next button when you are done entering your thought.</Text>
      </Fragment>
    )
  }
  return (
    <Fragment>
      <Text style={smallText}>
        Now add a thought to “{TUTORIAL_CONTEXT[tutorialChoice]}”.{' '}
        {tutorialChoice === TUTORIAL_VERSION_TODO
          ? "This could be any task you'd like to get done."
          : tutorialChoice === TUTORIAL_VERSION_JOURNAL
          ? 'This could be a specific person or a general thought about relationships.'
          : tutorialChoice === TUTORIAL_VERSION_BOOK
          ? 'You can just make up something about Psychology you could imagine hearing on a podcast.'
          : null}
      </Text>
      {
        // e.g. Home
        rootChildren.find(
          child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase(),
        ) &&
        // e.g. Home/To Do
        getChildrenRanked(store.getState(), [TUTORIAL_CONTEXT1_PARENT[tutorialChoice]]).find(
          child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
        ) ? (
          <Text style={smallText}>
            Do you remember how to do it?
            <TutorialHint>
              <Text style={smallText}>
                {!cursor || headValue(cursor).toLowerCase() !== TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()
                  ? `Select "${TUTORIAL_CONTEXT[tutorialChoice]}". `
                  : null}
                Trace the line below with your finger to create a new thought{' '}
                <Text style={[smallText, italic]}>within</Text> "{TUTORIAL_CONTEXT[tutorialChoice]}".
              </Text>
            </TutorialHint>
          </Text>
        ) : (
          <Text style={smallText}>
            Oops, somehow “{TUTORIAL_CONTEXT[tutorialChoice]}” was changed or deleted. Click the Prev button to go back.
          </Text>
        )
      }
    </Fragment>
  )
}

export default Tutorial2StepContext1SubThought
