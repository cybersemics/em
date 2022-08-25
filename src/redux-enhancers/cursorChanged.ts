import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import State from '../@types/State'
import * as selection from '../device/selection'
import equalPath from '../util/equalPath'
import headValue from '../util/headValue'
import isDivider from '../util/isDivider'

/**
 * Store enhancer to detect cursor change and trigger appropriate actions (clear selection for now).
 */
const cursorChangedEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> => {
    /** Clears the cursor selection if on divider or cursor is null. */
    const cursorChangedReducer = (state: State | undefined = initialState, action: A): State => {
      if (!state) return reducer(initialState, action)
      const updatedState = reducer(state || initialState, action)
      if (
        // selection may still exist after jump to null
        !updatedState.cursor ||
        // clear selection when cursor is on divider
        (!equalPath(state.cursor, updatedState.cursor) && isDivider(headValue(updatedState, updatedState.cursor)))
      ) {
        selection.clear()
      }

      return updatedState
    }

    return createStore(cursorChangedReducer, initialState)
  }

export default cursorChangedEnhancer
