import { TUTORIAL_CONTEXT, TUTORIAL_CONTEXT2_PARENT } from '../../../constants'
import { getChildrenRanked } from '../../../selectors/getChildren'
import store from '../../../stores/app'

/** Returns true if the first context thought has been created, e.g. /Work/To Do/y. */
const context2SubthoughtCreated = ({ rootChildren, tutorialChoice }) => {
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

export default context2SubthoughtCreated
