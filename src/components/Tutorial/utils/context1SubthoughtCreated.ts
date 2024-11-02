import State from '../../../@types/State'
import { HOME_TOKEN, TUTORIAL_CONTEXT, TUTORIAL_CONTEXT1_PARENT } from '../../../constants'
import contextToThoughtId from '../../../selectors/contextToThoughtId'
import { getAllChildrenAsThoughts, getChildrenRanked, hasChildren } from '../../../selectors/getChildren'

/** Returns true if the first context thought has been created, e.g. /Home/To Do/x. */
const context1SubthoughtCreated = (
  state: State,
  { tutorialChoice }: { tutorialChoice: keyof typeof TUTORIAL_CONTEXT1_PARENT },
) => {
  const rootChildren = getAllChildrenAsThoughts(state, HOME_TOKEN)
  const context1Id = contextToThoughtId(state, [TUTORIAL_CONTEXT1_PARENT[tutorialChoice]])

  return (
    context1Id &&
    // e.g. Home
    rootChildren.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) &&
    // e.g. Home/To Do
    getChildrenRanked(state, context1Id).find(
      child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
    ) &&
    // e.g. Home/To Do/x
    // TODO
    hasChildren(
      state,
      getChildrenRanked(state, context1Id).find(
        child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
      )!.id,
    )
  )
}

export default context1SubthoughtCreated
