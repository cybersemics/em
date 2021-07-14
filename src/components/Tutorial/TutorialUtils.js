import { TUTORIAL_CONTEXT, TUTORIAL_CONTEXT1_PARENT, TUTORIAL_CONTEXT2_PARENT } from '../../constants'
import { getChildrenRanked } from '../../selectors'
import { store } from '../../store'

/** Returns true if the first context thought has been created, e.g. /Home/To Do/x. */
export const context1SubthoughtCreated = ({ rootChildren, tutorialChoice }) => {
  const state = store.getState()

  // e.g. Home
  return (
    rootChildren.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) &&
    // e.g. Home/To Do
    getChildrenRanked(state, [TUTORIAL_CONTEXT1_PARENT[tutorialChoice]]).find(
      child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
    ) &&
    // e.g. Home/To Do/x
    getChildrenRanked(state, [TUTORIAL_CONTEXT1_PARENT[tutorialChoice], TUTORIAL_CONTEXT[tutorialChoice]]).length > 0
  )
}

/** Returns true if the first context thought has been created, e.g. /Work/To Do/y. */
export const context2SubthoughtCreated = ({ rootChildren, tutorialChoice }) => {
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
