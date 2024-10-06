import { TUTORIAL_CONTEXT, TUTORIAL_CONTEXT1_PARENT } from '../../../constants'
import contextToThoughtId from '../../../selectors/contextToThoughtId'
import { getChildrenRanked } from '../../../selectors/getChildren'
import store from '../../../stores/app'

/** Returns true if the first context thought has been created, e.g. /Home/To Do/x. */
const context1SubthoughtCreated = ({ rootChildren, tutorialChoice }) => {
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

export default context1SubthoughtCreated
