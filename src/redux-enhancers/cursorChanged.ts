import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import equalPath from '../util/equalPath'
import headValue from '../util/headValue'
import isDivider from '../util/isDivider'
import * as selection from '../device/selection'
import State from '../@types/State'

/**
 * Store enhancer to detect cursor change and trigger appropriate actions (clear selection for now).
 */
const cursorChangedEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> => {
    /**
     * Clear cursor selection if on divider.
     */
    const cursorChangedReducer = (state: State | undefined = initialState, action: A): State => {
      if (!state) return reducer(initialState, action)
      const updatedState = reducer(state, action)
      if (
        updatedState.cursor &&
        !equalPath(state.cursor, updatedState.cursor) &&
        isDivider(headValue(updatedState, updatedState.cursor))
      ) {
        selection.clear()
      }
      return updatedState
    }

    return createStore(cursorChangedReducer, initialState)
  }

export default cursorChangedEnhancer
