import _ from 'lodash'
import type { Store } from 'redux'
import type State from '../@types/State'
import type { ThoughtspaceMaterializationBridge } from './thoughtspace'

/** Publishes committed storage and matching write confirmations through the existing Redux projection. */
const createThoughtspaceMaterializationBridge = (
  store: Pick<Store<State>, 'getState' | 'dispatch'>,
): ThoughtspaceMaterializationBridge => ({
  getGeneration: () => store.getState().thoughtspaceGeneration,
  onCommit: ({ thoughtIndex, lexemeIndex, writeIds }) => {
    const current = store.getState().thoughts
    const thoughtsForRedux = Object.fromEntries(
      Object.entries(thoughtIndex).map(([id, thought]) => {
        if (!thought) return [id, null]
        const previous = current.thoughtIndex[id]
        const pending = previous?.pending || current.thoughtIndex[thought.parentId]?.pending
        return [
          id,
          {
            ...thought,
            ...(pending ? { pending } : null),
            ...(previous?.generating !== undefined ? { generating: previous.generating } : null),
            ...(previous?.splitSource !== undefined ? { splitSource: previous.splitSource } : null),
          },
        ]
      }),
    )
    const changedLexemes = Object.fromEntries(
      Object.entries(lexemeIndex).filter(([key, value]) => !_.isEqual(value ?? undefined, current.lexemeIndex[key])),
    )
    // Even an unchanged commit must acknowledge its pending writes.
    if (!writeIds && Object.keys(thoughtsForRedux).length === 0 && Object.keys(changedLexemes).length === 0) return
    store.dispatch({
      type: 'updateThoughts',
      thoughtIndexUpdates: thoughtsForRedux,
      lexemeIndexUpdates: changedLexemes,
      local: false,
      remote: false,
      repairCursor: true,
      materialized: true,
      confirmedWriteIds: writeIds,
    })
  },
})

export default createThoughtspaceMaterializationBridge
