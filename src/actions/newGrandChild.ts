import State from '../@types/State'
import Thunk from '../@types/Thunk'
import newThought from '../actions/newThought'
import { TUTORIAL_STEP_START } from '../constants'
import { firstVisibleChild } from '../selectors/getChildren'
import getRootPath from '../selectors/getRootPath'
import getSetting from '../selectors/getSetting'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import head from '../util/head'

/**
 * Creates a new grandchild at the first visible subthought of the cursor. When there is no cursor, the root stands in for it, so the new thought is created in the first visible child of the root.
 */
const newGrandChild = (state: State): State => {
  const tutorial = getSetting(state, 'Tutorial') !== 'Off'
  const tutorialStep = +!getSetting(state, 'Tutorial Step')

  // cancel if the tutorial has just started
  if (tutorial && tutorialStep === TUTORIAL_STEP_START) return state

  const path = state.cursor || getRootPath(state)
  const firstChild = firstVisibleChild(state, head(path))

  // stop if there is no visible children
  if (!firstChild) return state

  return newThought(state, { insertNewSubthought: true, at: appendToPath(path, firstChild.id) })
}

/** Action-creator for newGrandChild. */
export const newGrandChildActionCreator = (): Thunk => dispatch => dispatch({ type: 'newGrandChild' })

export default newGrandChild

// Register this action's metadata
registerActionMetadata('newGrandChild', {
  undoable: true,
})
