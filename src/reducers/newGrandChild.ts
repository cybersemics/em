import { TUTORIAL_STEP_START } from '../constants'
import { State } from '../util/initialState'

// selectors
import { getSetting, getThoughtsRanked, hasChild } from '../selectors'

// util
import {
  isFunction,
  pathToContext,
  unroot,
} from '../util'

// reducers
import newThought from './newThought'

/**
 * Creates a new grand child at first visible subthought.
 */
const newGrandChild = (state: State) => {
  const { cursor } = state

  const tutorial = getSetting(state, 'Tutorial') !== 'Off'
  const tutorialStep = +!getSetting(state, 'Tutorial Step')

  // cancel if cursor is not available or tutorial has just started
  if (!cursor || (tutorial && tutorialStep === TUTORIAL_STEP_START)) return

  const cursorContext = pathToContext(cursor)

  const children = getThoughtsRanked(state, cursorContext)

  const firstVisibleChild = children.find(child => {
    const childPath = unroot(cursorContext.concat(child.value))
    return state.showHiddenThoughts ||
      // exclude meta thoughts when showHiddenThoughts is off
      (!isFunction(child.value)
      && !hasChild(state, childPath, '=hidden')
      )
  })

  // stop if there is no visible children
  if (!firstVisibleChild) return

  return newThought(state, { insertNewSubthought: true, at: cursor.concat(firstVisibleChild) })
}

export default newGrandChild
