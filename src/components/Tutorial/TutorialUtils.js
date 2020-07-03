import { store } from '../../store'

// util
import {
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
} from '../../constants'

// selectors
import getThoughtsRanked from '../../selectors/getThoughtsRanked'

/** Returns true if the first context thought has been created, e.g. /Home/To Do/x. */
export const context1SubthoughtCreated = ({ rootSubthoughts, tutorialChoice }) => {

  const state = store.getState()

  // e.g. Home
  return rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) &&
  // e.g. Home/To Do
  getThoughtsRanked(state, [TUTORIAL_CONTEXT1_PARENT[tutorialChoice]]).find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()) &&
  // e.g. Home/To Do/x
  getThoughtsRanked(state, [TUTORIAL_CONTEXT1_PARENT[tutorialChoice], TUTORIAL_CONTEXT[tutorialChoice]]).length > 0
}

/** Returns true if the first context thought has been created, e.g. /Work/To Do/y. */
export const context2SubthoughtCreated = ({ rootSubthoughts, tutorialChoice }) => {

  const state = store.getState()

  // e.g. Work
  return rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()) &&
  // e.g. Work/To Do
  getThoughtsRanked(state, [TUTORIAL_CONTEXT2_PARENT[tutorialChoice]]).find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()) &&
  // e.g. Work/To Do/y
  getThoughtsRanked(state, [TUTORIAL_CONTEXT2_PARENT[tutorialChoice], TUTORIAL_CONTEXT[tutorialChoice]]).length > 0
}
