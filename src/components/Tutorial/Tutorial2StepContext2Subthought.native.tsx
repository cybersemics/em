import React, { Fragment } from 'react'
import { store } from '../../store'

import {
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT2_PARENT,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_TODO,
} from '../../constants'

import { headValue } from '../../util'
import { contextToThoughtId, findDescendant, getContexts, getChildrenRanked } from '../../selectors'
import TutorialHint from './TutorialHint'
import StaticSuperscript from '../StaticSuperscript'
import { Text } from '../Text.native'
import { commonStyles } from '../../style/commonStyles'
import { doStringsMatch } from '../../util/doStringsMatch'
import { ThoughtId, Path } from '../../@types'

type TutorialChoice = typeof TUTORIAL_CONTEXT2_PARENT

interface IComponentProps {
  rootChildren: ThoughtId[]
  tutorialChoice: keyof TutorialChoice
  cursor?: Path
}

const { smallText, italic } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const context2SubthoughtCreated = ({ rootChildren, tutorialChoice }: IComponentProps) => {
  const state = store.getState()

  const tutorialChoiceParentId = contextToThoughtId(state, [TUTORIAL_CONTEXT2_PARENT[tutorialChoice]])
  const tutorialChoiceId =
    tutorialChoiceParentId && findDescendant(state, tutorialChoiceParentId, TUTORIAL_CONTEXT[tutorialChoice])
  // e.g. Work
  return (
    tutorialChoiceId &&
    // e.g. Work/To Do/y
    getChildrenRanked(state, tutorialChoiceId).length > 0
  )
}

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext2Subthought = ({ tutorialChoice, rootChildren, cursor }: IComponentProps) => {
  const state = store.getState()
  const value = TUTORIAL_CONTEXT[tutorialChoice] || ''
  const caseSensitiveValue = getContexts(state, value).length > 0 ? value : value.toLowerCase()
  const contexts = getContexts(state, caseSensitiveValue)

  const isContext2SubthoughtCreated = context2SubthoughtCreated({ rootChildren, tutorialChoice })

  if (isContext2SubthoughtCreated) {
    return (
      <Fragment>
        <Text style={smallText}>Nice work!</Text>
        <Text style={smallText}>Tap the Next button when you are done entering your thought.</Text>
      </Fragment>
    )
  }

  const tutorialChoiceParentId = contextToThoughtId(state, [TUTORIAL_CONTEXT2_PARENT[tutorialChoice]])

  return (
    <Fragment>
      <Text style={smallText}>Very good!</Text>
      <Text style={smallText}>
        Notice the small number (<StaticSuperscript n={contexts.length} />
        ). This means that “{caseSensitiveValue}” appears in {contexts.length} place{contexts.length === 1 ? '' : 's'},
        or <Text style={[smallText, italic]}>contexts</Text> (in our case{' '}
        {/* @MIGRATION_TODO: How to get contexts here ?? */}
        {/* {joinConjunction(
          contexts
            .filter(parent => !isRoot(parent as unknown as ThoughtContext[]))
            .map(parent => `"${head(parent.contexts)}"`),
        )} */}
        ).
      </Text>
      <Text style={smallText}>
        Imagine{' '}
        {tutorialChoice === TUTORIAL_VERSION_TODO
          ? 'a new work task.'
          : tutorialChoice === TUTORIAL_VERSION_JOURNAL
          ? 'a realization you have about relationships in therapy.'
          : tutorialChoice === TUTORIAL_VERSION_BOOK
          ? 'a new thought related to psychology.'
          : null}{' '}
        Add it to this “{TUTORIAL_CONTEXT[tutorialChoice]}” list.
      </Text>
      {
        // e.g. Work
        tutorialChoiceParentId &&
        // e.g. Work/To Do
        getChildrenRanked(state, tutorialChoiceParentId).find(child =>
          doStringsMatch(child.value, TUTORIAL_CONTEXT[tutorialChoice]),
        ) ? (
          <>
            <Text style={smallText}>Do you remember how to do it?</Text>
            <TutorialHint>
              <Text style={smallText}>
                {!cursor || headValue(state, cursor).toLowerCase() !== TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()
                  ? `Select "${TUTORIAL_CONTEXT[tutorialChoice]}". `
                  : null}
                Trace the line below with your finger and hit Enter to create a new thought{' '}
                <Text style={[smallText, italic]}>within</Text> "{TUTORIAL_CONTEXT[tutorialChoice]}".
              </Text>
            </TutorialHint>
          </>
        ) : (
          <Text style={smallText}>
            Oops, somehow “{TUTORIAL_CONTEXT[tutorialChoice]}” was changed or deleted. Click the Prev button to go back.
          </Text>
        )
      }
    </Fragment>
  )
}

export default Tutorial2StepContext2Subthought
