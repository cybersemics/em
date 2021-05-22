import { Thunk } from '../types'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import { hashThought } from '../util'
import { updateThoughts, existingThoughtChange } from '.'

type Payload = Exclude<Parameters<(typeof existingThoughtChange)>[0], undefined>

/** Pulls the lexeme from local or remote for the new value if the lexeme is not available in the state yet. Then dispatched the exisitingThoughtChange.
 * This prevents lexeme getting overriden in local and remote after update.
 */
const thoughtChange = (payload: Payload): Thunk => async (dispatch, getState) => {

  const newValueHash = hashThought(payload.newValue)

  const state = getState()
  const { user, thoughts } = state

  const lexeme = thoughts.thoughtIndex[newValueHash]

  /**
    If there is no lexeme for the given new value we need to check if it's available in the local or remote data source.
    It is because the lexeme may not have been loaded in the state yet and may be overidden by existingThoughtChange updates.
   */
  if (!lexeme) {
    const localLexeme = await db.getThoughtById(newValueHash)

    const remoteLexeme = user ? await getFirebaseProvider(state, dispatch).getThoughtById(newValueHash) : null

    const latestLexeme = localLexeme && remoteLexeme ?
      localLexeme.lastUpdated > remoteLexeme.lastUpdated ? localLexeme : remoteLexeme
      : localLexeme || remoteLexeme

    if (latestLexeme) {
      dispatch(
        updateThoughts({
          local: false,
          remote: false,
          contextIndexUpdates: {},
          thoughtIndexUpdates: {
            [newValueHash]: latestLexeme
          }
        })
      )
    }
  }

  dispatch(existingThoughtChange(payload))

}

export default thoughtChange
