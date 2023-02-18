import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import State from '../@types/State'
import db from '../data-providers/yjs/thoughtspace'

/** Clears state.pushQueue on the next action when pushQueue has been invalidated by pushQueue, and then clear the invalidated flag. This is done to avoid an additional dispatch and thus selector recalculations on every thought change. Do not access state.pushQueue outside of a reducer, as it may be stale. */
const clearPushQueueEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> =>
    createStore((state: State | undefined = initialState, action: A): State => {
      if (!state) return reducer(initialState, action)

      // push queued updates to db
      // Promise.all(state.pushQueue.map(batch =>
      state.pushQueue.forEach(batch =>
        db.updateThoughts?.(batch.thoughtIndexUpdates, batch.lexemeIndexUpdates, batch.updates?.schemaVersion),
      )

      // clear push queue
      return reducer({ ...state, pushQueue: [] }, action)
    }, initialState)

export default clearPushQueueEnhancer
