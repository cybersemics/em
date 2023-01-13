import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import State from '../@types/State'
import pushStore from '../stores/push'

/** Clears state.pushQueue on the next action when pushQueue has been invalidated by pushQueue, and then clear the invalidated flag. This is done to avoid an additional dispatch and thus selector recalculations on every thought change. Do not access state.pushQueue outside of a reducer, as it may be stale. */
const clearPushQueueEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> =>
    createStore((state: State | undefined = initialState, action: A): State => {
      const stateNew = state || initialState
      const isInvalidated = pushStore.getState().invalidated
      if (isInvalidated) {
        pushStore.update({ invalidated: false })
      }

      return reducer(isInvalidated ? { ...stateNew, pushQueue: [] } : stateNew, action)
    }, initialState)

export default clearPushQueueEnhancer
