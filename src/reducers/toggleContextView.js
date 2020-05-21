// constants
import {
  TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE,
} from '../constants'

// util
import {
  hashContext,
  headValue,
  pathToContext,
  updateUrlHistory,
} from '../util'

// selectors
import {
  getContexts,
  getSetting,
} from '../selectors'

// reducers
import settings from './settings'

/**
 * Toggles the context view on a given thought.
 * SIDE EFFECTS: updateUrlHistory
 */
export default state => {

  if (!state.cursor) return

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const value = headValue(state.cursor)
  // const ngrams = getNgrams(value, 3, { thoughtIndex: state.thoughtIndex })
  // const subthoughtUnderSelection = findSubthoughtByIndex(ngrams, window.getSelection().focusOffset)

  const thoughts = /* subthoughtUnderSelection.contexts.length > 0 && subthoughtUnderSelection.text !== value
    ? [stripPunctuation(subthoughtUnderSelection.text)]
    : */pathToContext(state.cursor)

  const encoded = hashContext(thoughts)
  const contextViews = Object.assign({}, state.contextViews)

  if (encoded in state.contextViews) {
    delete contextViews[encoded] // eslint-disable-line fp/no-delete
  }
  else {
    contextViews[encoded] = true
  }

  updateUrlHistory(state, state.cursor, { contextViews })

  const tutorialStep = +getSetting(state, 'Tutorial Step')
  return {
    contextViews,
    ...settings(state, {
      key: 'Tutorial Step',
      value: tutorialStep + (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE ? getContexts(state, headValue(state.cursor)).length > 1 ? 1 : 0.1 : 0)
    })
  }
}
