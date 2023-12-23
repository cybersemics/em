import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import State from '../@types/State'
import { HOME_TOKEN } from '../constants'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import editingValueStore from '../stores/editingValue'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import isRoot from '../util/isRoot'

/**
 * Store enhancer to detect cursor change and trigger appropriate actions (clear selection for now).
 */
const cursorChangedEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> => {
    /** Reducer to modify the state when the cursor is changed. */
    const cursorChangedReducer = (state: State | undefined = initialState, action: A): State => {
      if (!state) return reducer(initialState, action)
      const updatedState: State = reducer(state || initialState, action)
      const thought = updatedState.cursor ? getThoughtById(updatedState, head(updatedState.cursor)) : null
      if (updatedState.cursor && !thought) {
        const errorMessage = `Cursor thought does not exist: ${updatedState.cursor}`
        console.error(errorMessage, {
          action,
          cursor: updatedState.cursor,
          previousCursor: state.cursor,
        })
        throw new Error(errorMessage)
      } else if (updatedState.cursor && isRoot(updatedState.cursor)) {
        const errorMessage = `Cursor should be set to null, not [${HOME_TOKEN}]`
        console.error(errorMessage, {
          action,
          cursor: updatedState.cursor,
          previousCursor: state.cursor,
        })
        throw new Error(errorMessage)
      }

      const value = thought?.value ?? null

      // clears the cursor selection if on divider or cursor is null.
      const cursorCleared = // selection may still exist after jump to null
        (!updatedState.cursor && selection.isThought()) ||
        // clear selection when cursor is on divider
        (!equalPath(state.cursor, updatedState.cursor) && isDivider(value))

      // defer till next tick because each of these side effects can trigger another state update
      Promise.resolve().then(() => {
        // The live editing value is stored in a separate ministore to avoid Redux store churn.
        // When the cursor changes, update the editingValue store.
        editingValueStore.update(value)

        // selection.clear() can trigger Editable.onBlur which leads to store.getState()
        if (cursorCleared) {
          selection.clear()
        }
      })

      return updatedState
    }

    return createStore(cursorChangedReducer, initialState)
  }

export default cursorChangedEnhancer
