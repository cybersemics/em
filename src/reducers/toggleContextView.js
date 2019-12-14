// constants
import {
  RENDER_DELAY,
  TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE,
} from '../constants.js'

// util
import {
  encodeItems,
  exists,
  getContexts,
  headKey,
  unrank,
  updateUrlHistory,
} from '../util.js'

import { store } from '../store.js'

// reducers
import { settings } from './settings.js'

// SIDE EFFECTS: updateUrlHistory
export const toggleContextView = state => {

  if (!state.cursor) return

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const key = headKey(state.cursor)
  // const subthoughts = getSubthoughts(key, 3, { data: state.data })
  // const subthoughtUnderSelection = findSubthoughtByIndex(subthoughts, window.getSelection().focusOffset)

  const items = /* subthoughtUnderSelection.contexts.length > 0 && subthoughtUnderSelection.text !== key
    ? [stripPunctuation(subthoughtUnderSelection.text)]
    : */unrank(state.cursor)

  const encoded = encodeItems(items)
  const contextViews = Object.assign({}, state.contextViews)

  // recreate missing children
  // this should only happen if there is a data integrity violation
  setTimeout(() => {
    (state.contextChildren[encoded] || []).forEach(child => {
      const childExists = exists(child.key, state.data)

      if (!childExists) {
        console.warn('Recreating missing thought:', child.key)
        store.dispatch({
          type: 'newItemSubmit',
          context: items,
          rank: child.rank,
          value: child.key
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

  updateUrlHistory(state.cursor, { data: state.data, contextViews })

  const tutorialStep = state.settings.tutorialStep
  return {
    contextViews,
    ...settings(state, {
      key: 'tutorialStep',
      value: tutorialStep + (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE ? (getContexts(headKey(state.cursor), state.data).length > 1 ? 1 : 0.1) : 0)
    })
  }
}
