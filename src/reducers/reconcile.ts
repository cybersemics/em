import _ from 'lodash'
import { updateThoughts } from '../reducers'
import { reducerFlow } from '../util'
import { EM_TOKEN } from '../constants'
import { Index, Lexeme, Thought, State, ThoughtId, ThoughtsInterface } from '../@types'
import { getThoughtById } from '../selectors'

interface ReconcileOptions {
  thoughtsResults: [ThoughtsInterface, ThoughtsInterface]
  // If true, updates local thoughts with thoughts that were only found on remote. Default: true.
  local?: boolean
  // If true, updates remote thoughts with thoughts that were only found on local. Default: true.
  remote?: boolean
}

const emContextEncoded = EM_TOKEN

/** Returns true if the source object is has been updated more recently than the destination object. */
const isNewer = (src: Thought | Lexeme, dest: Thought | Lexeme) => src.lastUpdated > dest.lastUpdated

/** Returns true if the em context should be updated. */
const shouldUpdateEm = (src: Thought, dest: Thought, key: string) =>
  key === emContextEncoded && src.children.length > dest.children.length

/** Compares local and remote and updates missing thoughts or those with older timestamps. */
const reconcile = (state: State, { thoughtsResults, local, remote }: ReconcileOptions) => {
  const [thoughtsLocal, thoughtsRemote] = thoughtsResults
  const updateLocal = local !== false
  const updateRemote = remote !== false

  /** Returns a predicate that returns true if a key is missing from the given destination object or it was updated more recently than the value in the destination object. */
  const shouldUpdateDest =
    (destObj: Index<Thought | Lexeme> = {}) =>
    (src: Thought | Lexeme, key: string) => {
      const dest = destObj[key]
      return (
        src &&
        (!(key in destObj) ||
          isNewer(src, dest) ||
          // allow EM context to be updated if source
          shouldUpdateEm(src as Thought, dest as Thought, key))
      )
    }

  // get the thoughts that are missing from either local or remote
  const contextIndexLocalOnly = updateRemote
    ? _.pickBy(thoughtsLocal.contextIndex, shouldUpdateDest(thoughtsRemote.contextIndex))
    : {}
  const contextIndexRemoteOnly = updateLocal
    ? _.pickBy(thoughtsRemote.contextIndex, shouldUpdateDest(thoughtsLocal.contextIndex))
    : {}
  const thoughtIndexLocalOnly = updateRemote
    ? _.pickBy(thoughtsLocal.thoughtIndex, shouldUpdateDest(thoughtsRemote.thoughtIndex))
    : {}
  const thoughtIndexRemoteOnly = updateLocal
    ? _.pickBy(thoughtsRemote.thoughtIndex, shouldUpdateDest(thoughtsLocal.thoughtIndex))
    : {}

  // get local pending thoughts that are returned by the remote but are not updateable
  // so that we can clear pending
  const contextIndexPending = _.mapValues(
    // get pending, non-updated thoughts
    _.pickBy(
      thoughtsLocal.contextIndex,
      (parentEntry: Thought, key: string) =>
        !getThoughtById(state, key as ThoughtId) &&
        !contextIndexLocalOnly[key] &&
        (thoughtsRemote.contextIndex || {})[key] &&
        parentEntry.pending,
    ),
    // clear pending
    parentEntry => ({
      ...parentEntry,
      pending: false,
    }),
  )

  return reducerFlow([
    // update state pending
    Object.keys(contextIndexPending).length > 0
      ? state =>
          updateThoughts(state, {
            contextIndexUpdates: contextIndexPending,
            thoughtIndexUpdates: {},
            local: false,
            remote: false,
          })
      : null,

    // update local (thoughts that were found to only be on remote)
    Object.keys(contextIndexRemoteOnly).length > 0 || Object.keys(thoughtIndexRemoteOnly).length > 0
      ? state =>
          updateThoughts(state, {
            contextIndexUpdates: contextIndexRemoteOnly,
            thoughtIndexUpdates: thoughtIndexRemoteOnly,
            // flags default to true, but use explicit values for clarity
            local: true,
            remote: false,
          })
      : null,

    // update remote (thoughts that were found to only be on local)
    Object.keys(contextIndexLocalOnly).length > 0 || Object.keys(thoughtIndexLocalOnly).length > 0
      ? state =>
          updateThoughts(state, {
            contextIndexUpdates: contextIndexLocalOnly,
            thoughtIndexUpdates: thoughtIndexLocalOnly,
            // flags default to true, but use explicit values for clarity
            local: false,
            remote: true,
          })
      : null,
  ])(state)
}

export default reconcile
