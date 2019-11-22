// constants
import {
  TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE,
} from '../constants.js'

// util
import {
  encodeItems,
  getContexts,
  sigKey,
  unrank,
  updateUrlHistory,
} from '../util.js'

// reducers
import { settings } from './settings.js'

// SIDE EFFECTS: updateUrlHistory
export const toggleContextView = state => {

  if (!state.cursor) return

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const key = sigKey(state.cursor)
  // const subthoughts = getSubthoughts(key, 3, { data: state.data })
  // const subthoughtUnderSelection = findSubthoughtByIndex(subthoughts, window.getSelection().focusOffset)

  const items = /* subthoughtUnderSelection.contexts.length > 0 && subthoughtUnderSelection.text !== key
    ? [stripPunctuation(subthoughtUnderSelection.text)]
    : */unrank(state.cursor)

  const encoded = encodeItems(items)
  const contextViews = Object.assign({}, state.contextViews)

  if (encoded in state.contextViews) {
    delete contextViews[encoded]
  }
  else {
    Object.assign(contextViews, {
      [encoded]: true
    })
  }

  updateUrlHistory(state.cursor, { data: state.data, contextViews })

  const tutorialStep = state.settings.tutorialStep
  return {
    contextViews,
    ...settings(state, {
      key: 'tutorialStep',
      value: tutorialStep + (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE ? (getContexts(sigKey(state.cursor), state.data).length > 1 ? 1 : 0.1) : 0)
    })
  }
}
