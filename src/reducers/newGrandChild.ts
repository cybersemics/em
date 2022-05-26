import { TUTORIAL_STEP_START } from '../constants'
import { firstVisibleChild, getSetting } from '../selectors'
import { appendToPath, head } from '../util'
import { newThought } from '../reducers'
import { State } from '../@types'

/**
 * Creates a new grand child at first visible subthought.
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

export default newGrandChild
