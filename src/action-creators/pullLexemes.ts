import { Index, Lexeme, ThoughtsInterface, Thunk } from '../types'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import { reconcile, updateThoughts } from '.'

/**
 * Fetches lexemes from the local and remote source and reconciles.
 */
const pullLexemes = (hashThoughtIds: string[]): Thunk<Promise<void>> => async (dispatch, getState) => {

  const localLexemes = await db.getThoughtsByIds(hashThoughtIds)

  const localLexemesIndex = hashThoughtIds.reduce<Index<Lexeme>>((acc, thoughtHash, index) => {
    return {
      ...acc,
      ...localLexemes[index] ? { [thoughtHash]: localLexemes[index]! } : {}
    }
  }, {})

  const state = getState()
  const { user } = state

  const remoteLexemes = user ? await getFirebaseProvider(state, dispatch).getThoughtsByIds(hashThoughtIds) : null

  // Update thoughts only if remoteLexemes are not available.
  if (!remoteLexemes) {
    dispatch(updateThoughts({
      thoughtIndexUpdates: localLexemesIndex,
      contextIndexUpdates: {},
      local: false,
      remote: false
    }))
    return
  }

  const remoteLexemesIndex = hashThoughtIds.reduce<Index<Lexeme>>((acc, thoughtHash, index) => {
    return {
      ...acc,
      ...remoteLexemes[index] ? { [thoughtHash]: remoteLexemes[index]! } : {}
    }
  }, {})

  const thoughtsLocal: ThoughtsInterface = {
    contextCache: [],
    thoughtCache: [],
    contextIndex: {},
    thoughtIndex: localLexemesIndex,
  }

  const thoughtsRemote: ThoughtsInterface = {
    contextCache: [],
    thoughtCache: [],
    contextIndex: {},
    thoughtIndex: remoteLexemesIndex,
  }

  dispatch(reconcile({
    thoughtsResults: [thoughtsLocal, thoughtsRemote]
  }))
}

export default pullLexemes
