import type { Store } from 'redux'
import type State from '../@types/State'
import type { ThoughtspaceMaterializationBridge } from './thoughtspace'

/** Publishes committed storage and matching write confirmations through the existing Redux projection. */
const createThoughtspaceMaterializationBridge = (
  store: Pick<Store<State>, 'getState' | 'dispatch'>,
): ThoughtspaceMaterializationBridge => ({
  getSnapshot: () => {
    const state = store.getState()
    return { generation: state.thoughtspaceGeneration, ...state.thoughts }
  },
  apply: ({ thoughtIndex, lexemeIndex, writeIds }) => {
    store.dispatch({
      type: 'updateThoughts',
      thoughtIndexUpdates: thoughtIndex,
      lexemeIndexUpdates: lexemeIndex,
      local: false,
      remote: false,
      repairCursor: true,
      materialized: true,
      confirmedWriteIds: writeIds,
    })
  },
})

export default createThoughtspaceMaterializationBridge
