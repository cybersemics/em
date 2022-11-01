import { TUTORIAL_CONTEXT, TUTORIAL_CONTEXT1_PARENT, TUTORIAL_CONTEXT2_PARENT } from '../../constants'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import { getChildrenRanked } from '../../selectors/getChildren'
import store from '../../stores/app'

/** Returns true if the first context thought has been created, e.g. /Home/To Do/x. */
export const context1SubthoughtCreated = ({ rootChildren, tutorialChoice }) => {
  const state = store.getState()
  const context1Id = contextToThoughtId(state, TUTORIAL_CONTEXT1_PARENT[tutorialChoice])

  // e.g. Home
  return (
    rootChildren.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) &&
    // e.g. Home/To Do
    getChildrenRanked(state, [context1Id]).find(
      child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
    ) &&
    // e.g. Home/To Do/x
    getChildrenRanked(state, [context1Id, TUTORIAL_CONTEXT[tutorialChoice]]).length > 0
  )
}

/** Returns true if the first context thought has been created, e.g. /Work/To Do/y. */
export const context2SubthoughtCreated = ({ rootChildren, tutorialChoice }) => {
  const state = store.getState()
  const context2Id = TUTORIAL_CONTEXT2_PARENT[tutorialChoice]

  // e.g. Work
  return (
    rootChildren.find(child => child.value.toLowerCase() === context2Id.toLowerCase()) &&
    // e.g. Work/To Do
    getChildrenRanked(state, [context2Id]).find(
      child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
    ) &&
    // e.g. Work/To Do/y
    getChildrenRanked(state, [context2Id, TUTORIAL_CONTEXT[tutorialChoice]]).length > 0
  )
}
