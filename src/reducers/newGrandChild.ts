import { TUTORIAL_STEP_START } from '../constants'
import { firstVisibleChild, getSetting } from '../selectors'
import { pathToContext } from '../util'
import { newThought } from '../reducers'
import { State } from '../util/initialState'

/**
 * Creates a new grand child at first visible subthought.
 */
const newGrandChild = (state: State) => {
  const { cursor } = state

  const tutorial = getSetting(state, 'Tutorial') !== 'Off'
  const tutorialStep = +!getSetting(state, 'Tutorial Step')

  // cancel if cursor is not available or tutorial has just started
  if (!cursor || (tutorial && tutorialStep === TUTORIAL_STEP_START)) return state

  const cursorContext = pathToContext(cursor)

  const firstChild = firstVisibleChild(state, cursorContext)

  // stop if there is no visible children
  if (!firstChild) return state

  return newThought(state, { insertNewSubthought: true, at: cursor.concat(firstChild) })
}

export default newGrandChild
