import State from '../../../@types/State'
import { HOME_TOKEN, TUTORIAL_CONTEXT, TUTORIAL_CONTEXT2_PARENT } from '../../../constants'
import contextToThoughtId from '../../../selectors/contextToThoughtId'
import { getAllChildrenAsThoughts, getChildrenRanked, hasChildren } from '../../../selectors/getChildren'

/** Returns true if the first context thought has been created, e.g. /Work/To Do/y. */
const context2SubthoughtCreated = (
  state: State,
  { tutorialChoice }: { tutorialChoice: keyof typeof TUTORIAL_CONTEXT2_PARENT },
) => {
  const rootChildren = getAllChildrenAsThoughts(state, HOME_TOKEN)
  const context2Id = contextToThoughtId(state, [TUTORIAL_CONTEXT2_PARENT[tutorialChoice]])

  return (
    context2Id &&
    // e.g. Work
    rootChildren.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()) &&
    // e.g. Work/To Do
    getChildrenRanked(state, context2Id).find(
      child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
    ) &&
    // e.g. Work/To Do/y
    // TODO
    hasChildren(
      state,
      getChildrenRanked(state, context2Id).find(
        child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
      )!.id,
    )
  )
}

export default context2SubthoughtCreated
