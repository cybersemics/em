import { ActionCreator } from '../types'
import { TUTORIAL_STEP_START } from '../constants'
import { getSetting, getThoughts, hasChild } from '../selectors'

// util
import {
  isFunction,
  pathToContext,
  unroot,
} from '../util'

/**
 * Creates a new grand child at first visible subthought.
 */
const newGrandChild = (): ActionCreator => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  const tutorial = getSetting(state, 'Tutorial') !== 'Off'
  const tutorialStep = +!getSetting(state, 'Tutorial Step')

  // cancel if cursor is not available or tutorial has just started
  if (!cursor || (tutorial && tutorialStep === TUTORIAL_STEP_START)) return

  const cursorContext = pathToContext(cursor)

  const children = getThoughts(state, cursorContext)

  const firstVisibleChildren = children.find(child => {
    const childPath = unroot(cursorContext.concat(child.value))
    return state.showHiddenThoughts ||
      // exclude meta thoughts when showHiddenThoughts is off
      (!isFunction(child.value)
      && !hasChild(state, childPath, '=hidden')
      && !hasChild(state, childPath, '=readonly')
      && !hasChild(state, childPath, '=unextendable')
      )
  })

  // stop if there is no visible children
  if (!firstVisibleChildren) return

  dispatch({
    type: 'newThought',
    insertNewSubthought: true,
    at: cursor.concat(firstVisibleChildren)
  })
}

export default newGrandChild
