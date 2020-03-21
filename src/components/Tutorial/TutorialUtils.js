
import {
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT2_PARENT
} from '../../constants'

import {
  getThoughtsRanked
} from '../../util'

// returns true if the first context thought has been created, e.g. /Home/To Do/x
export const context1SubthoughtCreated = ({ rootSubthoughts, tutorialChoice }) =>
  // e.g. Home
  rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) &&
  // e.g. Home/To Do
  getThoughtsRanked([TUTORIAL_CONTEXT1_PARENT[tutorialChoice]]).find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()) &&
  // e.g. Home/To Do/x
  getThoughtsRanked([TUTORIAL_CONTEXT1_PARENT[tutorialChoice], TUTORIAL_CONTEXT[tutorialChoice]]).length > 0

// returns true if the first context thought has been created, e.g. /Work/To Do/y
export const context2SubthoughtCreated = ({ rootSubthoughts, tutorialChoice }) =>
  // e.g. Work
  rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()) &&
  // e.g. Work/To Do
  getThoughtsRanked([TUTORIAL_CONTEXT2_PARENT[tutorialChoice]]).find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()) &&
  // e.g. Work/To Do/y
  getThoughtsRanked([TUTORIAL_CONTEXT2_PARENT[tutorialChoice], TUTORIAL_CONTEXT[tutorialChoice]]).length > 0
