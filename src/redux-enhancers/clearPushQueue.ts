import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import State from '../@types/State'
import { syncStore } from '../redux-middleware/pushQueue'

/** Clears state.pushQueue on the next action when pushQueue has been invalidated by pushQueue. This is done to avoid an additional dispatch and thus selector recalculations on every thought change. Do not access state.pushQueue outside of a reducer, as it may be stale. */
const clearPushQueueEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> =>
    createStore((state: State | undefined = initialState, action: A): State => {
      const stateNew = state || initialState
      const isInvalidated = syncStore.getState().invalidated
      if (isInvalidated) {
        syncStore.update({ invalidated: false })
      }

      return reducer(isInvalidated ? { ...stateNew, pushQueue: [] } : stateNew, action)
    }, initialState)

export default clearPushQueueEnhancer
