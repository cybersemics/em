import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import { clearSelection, equalPath, headValue, isDivider } from '../util'
import { State } from '../util/initialState'

/**
 * Store enhancer to detect cursor change and trigger appropriate actions (clear selection for now).
 */
const cursorChangedEnhancer: StoreEnhancer<any> = (createStore: StoreEnhancerStoreCreator) => <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> => {

  /**
   * Clear cursor selection if on divider.
   */
  const cursorChangedReducer = (state: State | undefined = initialState, action: A): State => {
    if (!state) return reducer(initialState, action)

    const updatedState = reducer(state, action)
    if (updatedState.cursor && !equalPath(state.cursor, updatedState.cursor) && isDivider(headValue(updatedState.cursor))) {
      clearSelection()
    }
    return updatedState

  }

  return createStore(cursorChangedReducer, initialState)
}

export default cursorChangedEnhancer
