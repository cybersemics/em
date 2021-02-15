import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { SimplePath, ThoughtIndices } from '../types'
import { importHtml } from './importHTML'
import { initialState } from './initialState'

let whitelistedThoughts: ThoughtIndices

/**
 * Gets a list of whitelisted thoughts which are initialized only once. Whitelist the ROOT, EM, and EM descendants for updateThoughts so they are never deleted from the thought cache when not present on the remote data source.
 */
export const getWhitelistedThoughts = () => {
  if (whitelistedThoughts) return whitelistedThoughts
  const state = initialState()

  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = importHtml(state, [{ value: EM_TOKEN, rank: 0 }] as SimplePath, INITIAL_SETTINGS)

  whitelistedThoughts = {
    contextIndex: {
      ...state.thoughts.contextIndex,
      ...contextIndex,
    },
    thoughtIndex: {
      ...state.thoughts.thoughtIndex,
      ...thoughtIndex,
    },
  }
  return whitelistedThoughts
}
