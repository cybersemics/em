// constants
import {
  RENDER_DELAY,
  TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE,
} from '../constants.js'

// util
import {
  hashContext,
  exists,
  getContexts,
  headValue,
  pathToContext,
  updateUrlHistory,
} from '../util.js'

import { store } from '../store.js'

// reducers
import { settings } from './settings.js'

// SIDE EFFECTS: updateUrlHistory
export const toggleContextView = state => {

  if (!state.cursor) return

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const key = headValue(state.cursor)
  // const subthoughts = getSubthoughts(key, 3, { thoughtIndex: state.thoughtIndex })
  // const subthoughtUnderSelection = findSubthoughtByIndex(subthoughts, window.getSelection().focusOffset)

  const thoughts = /* subthoughtUnderSelection.contexts.length > 0 && subthoughtUnderSelection.text !== key
    ? [stripPunctuation(subthoughtUnderSelection.text)]
    : */pathToContext(state.cursor)

  const encoded = hashContext(thoughts)
  const contextViews = Object.assign({}, state.contextViews)

  // recreate missing children
  // this should only happen if there is a thoughtIndex integrity violation
  setTimeout(() => {
    (state.contextIndex[encoded] || []).forEach(child => {
      const childExists = exists(child.value, state.thoughtIndex)

      if (!childExists) {
        console.warn('Recreating missing thought:', child.value)
        store.dispatch({
          type: 'newThoughtSubmit',
          context: thoughts,
          rank: child.rank,
          value: child.value
        })
      }

    })
  }, RENDER_DELAY)

  if (encoded in state.contextViews) {
    delete contextViews[encoded] // eslint-disable-line fp/no-delete
  }
  else {
    contextViews[encoded] = true
  }

  updateUrlHistory(state.cursor, { thoughtIndex: state.thoughtIndex, contextViews })

  const tutorialStep = state.settings.tutorialStep
  return {
    contextViews,
    ...settings(state, {
      key: 'tutorialStep',
      value: tutorialStep + (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE ? (getContexts(headValue(state.cursor), state.thoughtIndex).length > 1 ? 1 : 0.1) : 0)
    })
  }
}
