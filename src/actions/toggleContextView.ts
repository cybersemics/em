import { produce } from 'immer'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import settings from '../actions/settings'
import { TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE } from '../constants'
import globals from '../globals'
import expandThoughts from '../selectors/expandThoughts'
import getContexts from '../selectors/getContexts'
import getSetting from '../selectors/getSetting'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import hashPath from '../util/hashPath'
import headValue from '../util/headValue'
import reducerFlow from '../util/reducerFlow'

/** Toggles the context view on a given thought. */
const toggleContextView = (state: State): State => {
  if (!state.cursor) return state

  const HASHED_CURSOR_KEY = hashPath(state.cursor!)

  return reducerFlow([
    // update contextViews and set contextViewToggledOn
    (state: State) => {
      let outcomeTurningOn: boolean

      const newContextViews = produce(state.contextViews, draft => {
        if (HASHED_CURSOR_KEY in state.contextViews) {
          delete draft[HASHED_CURSOR_KEY]
          outcomeTurningOn = false
        } else {
          draft[HASHED_CURSOR_KEY] = true
          outcomeTurningOn = true
        }
      })
      return {
        ...state,
        contextViews: newContextViews,
        contextViewToggledOn: outcomeTurningOn!,
      }
    },

    // update context views and expanded
    state => ({
      ...state,
      expanded: globals.suppressExpansion ? {} : expandThoughts(state, state.cursor),
    }),

    // advance tutorial from context view toggle step
    state => {
      const tutorialStep = +(getSetting(state, 'Tutorial Step') || 0)
      const cursorValue = state.cursor ? headValue(state, state.cursor) : undefined
      return Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE && cursorValue !== undefined
        ? settings(state, {
            key: 'Tutorial Step',
            value: (tutorialStep + (getContexts(state, cursorValue).length > 1 ? 1 : 0.1)).toString(),
          })
        : state
    },
  ])(state)
}

/** Action-creator for toggleContextView. */
export const toggleContextViewActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleContextView' })

export default toggleContextView

// Register this action's metadata
registerActionMetadata('toggleContextView', {
  undoable: true,
})
