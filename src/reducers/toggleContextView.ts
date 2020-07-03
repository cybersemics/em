import * as immer from 'immer'
import { TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE } from '../constants'
import { settings } from '../reducers'
import { expandThoughts, getContexts, getSetting, splitChain } from '../selectors'
import { hashContext, headValue, pathToContext, reducerFlow } from '../util'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Returns a new contextViews object with the given context toggled to the opposite of its previous value. */
const toggleContext = (state: State, context: Context) => immer.produce(state.contextViews, draft => {
  const encoded = hashContext(context)
  if (encoded in state.contextViews) {
    delete draft[encoded] // eslint-disable-line fp/no-delete
  }
  else {
    draft[encoded] = true
  }
  return draft
})

/** Toggles the context view on a given thought. */
const toggleContextView = (state: State) => {

  if (!state.cursor) return state

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const value = headValue(state.cursor)
  // const ngrams = getNgrams(value, 3, { thoughts: { thoughtIndex: state.thoughts.thoughtIndex } })
  // const subthoughtUnderSelection = findSubthoughtByIndex(ngrams, window.getSelection().focusOffset)
  // const context = subthoughtUnderSelection.contexts.length > 0 && subthoughtUnderSelection.text !== value
  //   ? [stripPunctuation(subthoughtUnderSelection.text)]
  //   : pathToContext(state.cursor)

  const context = pathToContext(state.cursor)

  return reducerFlow([

    // update contextViews
    state => ({
      ...state,
      contextViews: toggleContext(state, context),
    }),

    // update context views and expanded
    state => ({
      ...state,
      expanded: expandThoughts(state, state.cursor!, splitChain(state, state.cursor!))
    }),

    // advance tutorial from context view toggle step
    state => {
      const tutorialStep = +(getSetting(state, 'Tutorial Step') || 0)
      return Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE
        ? settings(state, {
          key: 'Tutorial Step',
          value: (tutorialStep + (getContexts(state, headValue(state.cursor!)).length > 1 ? 1 : 0.1)).toString()
        })
        : state
    },

  ])(state)
}

export default toggleContextView
