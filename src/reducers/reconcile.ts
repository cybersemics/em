import _ from 'lodash'
import { ParentEntry } from '../types'
import { GenericObject } from '../utilTypes'
import { updateThoughts } from '../reducers'
import { reducerFlow } from '../util'
import { State, ThoughtsInterface } from '../util/initialState'

/** Compares local and remote and updates missing thoughts or those with older timestamps. */
const reconcile = (state: State, { thoughtsResults }: { thoughtsResults: ThoughtsInterface[] }) => {

  const [thoughtsLocal, thoughtsRemote] = thoughtsResults

  /** Returns a predicate that returns true if a key is missing from the given destination object or it was updated more recently than the value in the destination object. The value's children or context properties must not empty. */
  const shouldUpdate = (dest: GenericObject<any> = {}) =>
    (value: any, key: string) =>
      value &&
      (value.children || value.contexts).length > 0 &&
      (!(key in dest) || value.lastUpdated > dest[key].lastUpdated)

  // get the thoughts that are missing from either local or remote
  const contextIndexLocalOnly = _.pickBy(thoughtsLocal.contextIndex, shouldUpdate(thoughtsRemote.contextIndex))
  const contextIndexRemoteOnly = _.pickBy(thoughtsRemote.contextIndex, shouldUpdate(thoughtsLocal.contextIndex))
  const thoughtIndexLocalOnly = _.pickBy(thoughtsLocal.thoughtIndex, shouldUpdate(thoughtsRemote.thoughtIndex))
  const thoughtIndexRemoteOnly = _.pickBy(thoughtsRemote.thoughtIndex, shouldUpdate(thoughtsLocal.thoughtIndex))

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
