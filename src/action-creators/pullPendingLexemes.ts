import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import PushBatch from '../@types/PushBatch'
import State from '../@types/State'
import { Thunk } from '../@types/Thunk'
import updateThoughts from '../action-creators/updateThoughts'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import getThoughtById from '../selectors/getThoughtById'
import normalizeThought from '../util/normalizeThought'
import pull from './pull'

/** Merges conflicting Lexemes from two different LexemeIndexUpdates. Only returns Lexemes with actual conflicts. Used to merge pulled Lexemes into a PushBatch. */
const mergeConflictingLexemeIndexUpdates = (
  state: State,
  lexemeIndexUpdatesA: Index<Lexeme | null>,
  lexemeIndexUpdatesB: Index<Lexeme | null>,
): Index<Lexeme> =>
  Object.keys(lexemeIndexUpdatesB).reduce<Index<Lexeme>>((acc, key) => {
    const lexemeA = lexemeIndexUpdatesA[key]
    const lexemeB = lexemeIndexUpdatesB[key]

    // Bail if either lexeme is missing since we are only merging conflicting updates.
    if (!lexemeA || !lexemeB) return acc

    // If pulled Lexeme A contexts have been edited, the thought values may no longer be in conflict.
    // Inserting them would result in an invalid Lexeme context added to Lexeme B.
    // Filter out Lexeme A contexts whose values no longer match the Lexeme value.
    // Only merge thoughts that are still conflicting with Lexeme B contexts, or are completely new.
    // See: https://github.com/cybersemics/em/issues/1559
    const lexemeAContextsFiltered = lexemeA.contexts.filter(id => {
      const thought = getThoughtById(state, id)
      return !thought || normalizeThought(thought.value) === lexemeA.lemma
    })

    // get the Lexeme's contexts in the pulled state without the lexemeA contexts
    const lexemeBcontextsDiff = lexemeB.contexts.filter(
      thoughtIdB => !lexemeAContextsFiltered.some(thoughtIdA => thoughtIdA === thoughtIdB),
    )

    // if there are contexts in lexemeB that are not in A, then return without updates
    if (lexemeBcontextsDiff.length === 0) return acc

    return {
      ...acc,
      [key]: {
        ...lexemeA,
        contexts: [...lexemeAContextsFiltered, ...lexemeBcontextsDiff],
      },
    }
  }, {})

/**
 * Fetches lexemes from local and remote and merges them into a PushBatch. When there is a synchronous edit in state, the Lexeme may already exist in the local or remote. This function ensures that the local/remote Lexeme gets merged with the edited Lexeme in Redux state. It updates Redux state only (like pull) and returns LexemeIndexUpdates so that they can be merged into the existing batch and sent in one push.
 *
 * TODO: There seems to be a concurrency issue which can cause a remote Lexeme to be deleted unintentionally. This will hopefully be fixed once a CRDT is used during syncing. Luckily, Lexemes can be recreated from thoughts, so no data is permanently lost. Run the repair script to restore deleted Lexemes.
 *
 * Unable to identify exact steps since it is a timing issue, but here is a possible sequennce:
 * - User types “Discussion”.
 * - Throttled edits are flushed at “Discuss”.
 * - New Lexeme for "Discuss" is created.
 * - “Discuss” is added to pendingLexemes.
 * - Before pendingLexemes can be pulled, the throttled edit for "Discussion" is flushed.
 * - "Discuss" is deleted.
 * - The "Discuss" Lexeme is deleted from the remote.
 */
const pullPendingLexemes =
  (
    batch: PushBatch,
    {
      skipConflictResolution,
    }: {
      // skip conflict resolution and pull all Lexeme context Thoughts in addition to Lexemes
      // used to pull =favorites
      skipConflictResolution?: boolean
    } = {},
  ): Thunk<Promise<Index<Lexeme>>> =>
  async (dispatch, getState) => {
    // return if there are no pending lexemes
    const pendingLexemeIds = Object.keys(batch.pendingLexemes || {})
    if (pendingLexemeIds.length === 0) return Promise.resolve({})

    const state = getState()

    // pull local and remote Lexemes
    const [localLexemes, remoteLexemes] = await Promise.all([
      db.getLexemesByIds(pendingLexemeIds),
      state.status === 'loaded'
        ? getFirebaseProvider(state, dispatch).getLexemesByIds(pendingLexemeIds)
        : Promise.resolve({} as (Lexeme | undefined)[]),
    ])

    // generate a lexemeIndex from the pulled Lexemes
    const lexemeIndexPulled = pendingLexemeIds.reduce<Index<Lexeme>>((acc, thoughtHash, index) => {
      // assume local storage does not have Lexemes that remote doesn't have
      // keep remote if local is missing
      const lexemePulled = remoteLexemes[index] || localLexemes[index]
      return {
        ...acc,
        ...(lexemePulled ? { [thoughtHash]: lexemePulled } : {}),
      }
    }, {})

    const lexemeIndexUpdatesMerged = skipConflictResolution
      ? lexemeIndexPulled
      : mergeConflictingLexemeIndexUpdates(state, lexemeIndexPulled, batch.lexemeIndexUpdates)

    const contexts = Object.values(lexemeIndexUpdatesMerged).flatMap(lexeme => lexeme.contexts)

    // dispatch updateThoughts on Redux state only with the merged Lexemes to update the UI with new superscripts
    if (Object.keys(lexemeIndexUpdatesMerged).length > 0) {
      dispatch([
        updateThoughts({
          thoughtIndexUpdates: {},
          lexemeIndexUpdates: lexemeIndexUpdatesMerged,
          remote: false,
          local: false,
        }),
        skipConflictResolution ? pull(contexts) : null,
      ])
    }

    return lexemeIndexUpdatesMerged
  }

export default pullPendingLexemes
