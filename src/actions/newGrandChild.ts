import State from '../@types/State'
import Thunk from '../@types/Thunk'
import newThought from '../actions/newThought'
import { TUTORIAL_STEP_START } from '../constants'
import { firstVisibleChild } from '../selectors/getChildren'
import getSetting from '../selectors/getSetting'
import appendToPath from '../util/appendToPath'
import head from '../util/head'

/**
 * Creates a new grandchild at first visible subthought.
 */
const newGrandChild = (state: State) => {
  const { cursor } = state

  const tutorial = getSetting(state, 'Tutorial') !== 'Off'
  const tutorialStep = +!getSetting(state, 'Tutorial Step')

  // cancel if cursor is not available or tutorial has just started
  if (!cursor || (tutorial && tutorialStep === TUTORIAL_STEP_START)) return state

  const firstChild = firstVisibleChild(state, head(cursor))

  // stop if there is no visible children
  if (!firstChild) return state

  return newThought(state, { insertNewSubthought: true, at: appendToPath(cursor, firstChild.id) })
}

/** Action-creator for newGrandChild. */
export const newGrandChildActionCreator = (): Thunk => dispatch => dispatch({ type: 'newGrandChild' })

export default newGrandChild
