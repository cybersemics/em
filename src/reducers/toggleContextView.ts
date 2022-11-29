import * as immer from 'immer'
import State from '../@types/State'
import { TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE } from '../constants'
import globals from '../globals'
import settings from '../reducers/settings'
import expandThoughts from '../selectors/expandThoughts'
import getContexts from '../selectors/getContexts'
import getSetting from '../selectors/getSetting'
import hashPath from '../util/hashPath'
import headValue from '../util/headValue'
import reducerFlow from '../util/reducerFlow'

/** Toggles the context view on a given thought. */
const toggleContextView = (state: State) => {
  if (!state.cursor) return state

  return reducerFlow([
    // update contextViews
    state => ({
      ...state,
      contextViews: immer.produce(state.contextViews, draft => {
        const key = hashPath(state.cursor)
        if (key in state.contextViews) {
          delete draft[key] // eslint-disable-line fp/no-delete
        } else {
          draft[key] = true
        }
        return draft
      }),
    }),

    // update context views and expanded
    state => ({
      ...state,
      expanded: globals.suppressExpansion ? {} : expandThoughts(state, state.cursor),
    }),

    // advance tutorial from context view toggle step
    state => {
      const tutorialStep = +(getSetting(state, 'Tutorial Step') || 0)
      return Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE
        ? settings(state, {
            key: 'Tutorial Step',
            value: (
              tutorialStep + (getContexts(state, headValue(state, state.cursor!)).length > 1 ? 1 : 0.1)
            ).toString(),
          })
        : state
    },
  ])(state)
}

export default toggleContextView
