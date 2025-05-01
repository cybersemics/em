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
const toggleContextView = (state: State) => {
  if (!state.cursor) return state

  return reducerFlow([
    // update contextViews
    state => ({
      ...state,
      contextViews: produce(state.contextViews, draft => {
        const key = hashPath(state.cursor)
        if (key in state.contextViews) {
          delete draft[key]
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
