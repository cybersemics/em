import React, { Fragment } from 'react'
import { isMac, isTouch } from '../../browser'
import {
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT2_PARENT,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_TODO,
} from '../../constants'
// selectors
import { getContexts, getChildrenRanked } from '../../selectors'
import { store } from '../../store'
import { head, headValue, isRoot, joinConjunction } from '../../util'
import StaticSuperscript from '../StaticSuperscript'
import TutorialHint from './TutorialHint'

// eslint-disable-next-line jsdoc/require-jsdoc
const context2SubthoughtCreated = ({ rootChildren, tutorialChoice }) => {
  const state = store.getState()
  // e.g. Work
  return (
    rootChildren.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()) &&
    // e.g. Work/To Do
    getChildrenRanked(state, [TUTORIAL_CONTEXT2_PARENT[tutorialChoice]]).find(
      child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
    ) &&
    // e.g. Work/To Do/y
    getChildrenRanked(state, [TUTORIAL_CONTEXT2_PARENT[tutorialChoice], TUTORIAL_CONTEXT[tutorialChoice]]).length > 0
  )
}

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext2Subthought = ({ tutorialChoice, rootChildren, cursor }) => {
  const state = store.getState()
  const value = TUTORIAL_CONTEXT[tutorialChoice] || ''
  const caseSensitiveValue = getContexts(state, value).length > 0 ? value : value.toLowerCase()
  const contexts = getContexts(state, caseSensitiveValue)

  const isContext2SubthoughtCreated = context2SubthoughtCreated({ rootChildren, tutorialChoice })

  if (isContext2SubthoughtCreated) {
    return (
      <Fragment>
        <p>Nice work!</p>
        <p>{isTouch ? 'Tap' : 'Click'} the Next button when you are done entering your thought.</p>
      </Fragment>
    )
  }
  return (
    <Fragment>
      <p>Very good!</p>
      <p>
        Notice the small number (<StaticSuperscript n={contexts.length} />
        ). This means that “{caseSensitiveValue}” appears in {contexts.length} place{contexts.length === 1 ? '' : 's'},
        or <i>contexts</i> (in our case{' '}
        {joinConjunction(contexts.filter(parent => !isRoot(parent)).map(parent => `"${head(parent.context)}"`))}).
      </p>
      <p>
        Imagine{' '}
        {tutorialChoice === TUTORIAL_VERSION_TODO
          ? 'a new work task.'
          : tutorialChoice === TUTORIAL_VERSION_JOURNAL
          ? 'a realization you have about relationships in therapy.'
          : tutorialChoice === TUTORIAL_VERSION_BOOK
          ? 'a new thought related to psychology.'
          : null}{' '}
        Add it to this “{TUTORIAL_CONTEXT[tutorialChoice]}” list.
      </p>
      {
        // e.g. Work
        rootChildren.find(
          child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase(),
        ) &&
        // e.g. Work/To Do
        getChildrenRanked(state, [TUTORIAL_CONTEXT2_PARENT[tutorialChoice]]).find(
          child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
        ) ? (
          <p>
            Do you remember how to do it?
            <TutorialHint>
              <br />
              <br />
              {!cursor || headValue(cursor).toLowerCase() !== TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()
                ? `Select "${TUTORIAL_CONTEXT[tutorialChoice]}". `
                : null}
              {isTouch ? 'Trace the line below with your finger ' : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter `}
              to create a new thought <i>within</i> "{TUTORIAL_CONTEXT[tutorialChoice]}".
            </TutorialHint>
          </p>
        ) : (
          <p>
            Oops, somehow “{TUTORIAL_CONTEXT[tutorialChoice]}” was changed or deleted. Click the Prev button to go back.
          </p>
        )
      }
    </Fragment>
  )
}

export default Tutorial2StepContext2Subthought
