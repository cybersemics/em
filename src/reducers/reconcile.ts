import _ from 'lodash'
import { Lexeme, ParentEntry } from '../types'
import { GenericObject } from '../utilTypes'
import { updateThoughts } from '../reducers'
import { hashContext, reducerFlow } from '../util'
import { EM_TOKEN } from '../constants'
import { State, ThoughtsInterface } from '../util/initialState'

const emContextEncoded = hashContext([EM_TOKEN])

/** Returns true if the given ParentEntry or Lexeme has children. */
const hasChildren = (src: ParentEntry | Lexeme) =>
  (src as ParentEntry).children || (src as Lexeme).contexts.length > 0

/** Returns true if the source object is has been updated more recently than the destination object. */
const isNewer = (src: ParentEntry | Lexeme, dest: ParentEntry|Lexeme) =>
  src.lastUpdated > dest.lastUpdated

/** Returns true if the source object is pending. */
const isPending = (src: ParentEntry | Lexeme) => (src as ParentEntry).pending

/** Returns true if the em context should be updated. */
const shouldUpdateEm = (src: ParentEntry, dest: ParentEntry, key: string) =>
  key === emContextEncoded && src.children.length > dest.children.length

/** Compares local and remote and updates missing thoughts or those with older timestamps. */
const reconcile = (state: State, { thoughtsResults }: { thoughtsResults: ThoughtsInterface[] }) => {

  const [thoughtsLocal, thoughtsRemote] = thoughtsResults

  /** Returns a predicate that returns true if a key is missing from the given destination object or it was updated more recently than the value in the destination object. */
  const shouldUpdateDest = (destObj: GenericObject<ParentEntry | Lexeme> = {}) =>
    (src: ParentEntry | Lexeme, key: string) => {
      const dest = destObj[key]
      return src && !isPending(src) && hasChildren(src) && (
        !(key in destObj) ||
        isNewer(src, dest) ||
        // allow EM context to be updated if source
        shouldUpdateEm(src as ParentEntry, dest as ParentEntry, key)
      )
    }

  // get the thoughts that are missing from either local or remote
  const contextIndexLocalOnly = _.pickBy(thoughtsLocal.contextIndex, shouldUpdateDest(thoughtsRemote.contextIndex))
  const contextIndexRemoteOnly = _.pickBy(thoughtsRemote.contextIndex, shouldUpdateDest(thoughtsLocal.contextIndex))
  const thoughtIndexLocalOnly = _.pickBy(thoughtsLocal.thoughtIndex, shouldUpdateDest(thoughtsRemote.thoughtIndex))
  const thoughtIndexRemoteOnly = _.pickBy(thoughtsRemote.thoughtIndex, shouldUpdateDest(thoughtsLocal.thoughtIndex))

  // get local pending thoughts that are returned by the remote but are not updateable
  // so that we can clear pending
  const contextIndexPending = _.mapValues(
    // get pending, non-updated thoughts
    _.pickBy(thoughtsLocal.contextIndex, (parentEntry: ParentEntry, key: string) =>
      !contextIndexLocalOnly[key] &&
      (thoughtsRemote.contextIndex || {})[key] &&
      parentEntry.pending
    ),
    // clear pending
    parentEntry => ({
      ...parentEntry,
      pending: false,
    })
  )

  return reducerFlow([

    // update state pending
    Object.keys(contextIndexPending).length > 0
      ? state => updateThoughts(state, {
        contextIndexUpdates: contextIndexPending,
        thoughtIndexUpdates: {},
        local: false,
        remote: false,
      })
      : null,

    // update local
    Object.keys(contextIndexRemoteOnly).length > 0
      ? state => updateThoughts(state, {
        contextIndexUpdates: contextIndexRemoteOnly,
        thoughtIndexUpdates: thoughtIndexRemoteOnly,
        remote: false
      })
      : null,

    // update remote
    Object.keys(contextIndexLocalOnly).length > 0
      ? state => updateThoughts(state, {
        contextIndexUpdates: contextIndexLocalOnly,
        thoughtIndexUpdates: thoughtIndexLocalOnly,
        local: false
      })
      : null,

  ])(state)

}

export default reconcile
