import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import { decodeContextUrl, expandThoughts } from '../selectors'
import { equalArrays, hashContext, hashThought, head, keyValueBy, pathToContext } from '../util'
import { State } from '../util/initialState'
import { Index, Context, Ref, Parent, Lexeme } from '../types'
import { reconcile } from '../action-creators'
import getFirebaseProvider from '../data-providers/firebase'

/** Generates a map of all visible contexts, including the cursor, all its ancestors, and the expanded contexts. */
const getVisibleContexts = (state: State, expandedContexts: Index<Context>): Index<Context> => {

  const { cursor } = state

  // if there is no cursor, decode the url so the cursor can be loaded
  // after loading the ranks will be inferred to update the cursor
  const contextUrl = decodeContextUrl(state, window.location.pathname)
  const contextCursor = cursor ? pathToContext(cursor) : contextUrl

  return {
    ...expandedContexts,
    // generate the cursor and all its ancestors
    // i.e. ['a', b', 'c'], ['a', 'b'], ['a']
    ...keyValueBy(contextCursor, (value, i) => {
      const subcontext = contextCursor.slice(0, contextCursor.length - i)
      return subcontext.length > 0 ? { [hashContext(subcontext)]: subcontext } : null
    }),
  }
}

/**
 * Middleware to auto-sync thoughts from firebase. 2 major functions that this serves
 * 1) Maintains the list(thoughtListeners) of listeners for visible contexts, while deactivating the ones that are hidden.
 * 2) Builds the thoughtIndex by fetching all lexemes and triggers reconcile with thought and context index updates.
 */
const remoteSyncMiddleware: ThunkMiddleware<State> = ({ getState, dispatch }) => {

  let thoughtListeners: Index<Ref> = {}
  let lastExpanded: Index<Context> = {} // eslint-disable-line fp/no-let
  let thoughts: (Lexeme | undefined)[] = []// eslint-disable-line fp/no-let

  return next => async action => {

    next(action)
    if (action.type !== 'existingThoughtChange') return

    const state = getState()

    if (!state.authenticated || !state?.user?.uid) return

    const expandedContexts = expandThoughts(state, state.cursor, {
      returnContexts: true,
    })

    const visibleContexts = getVisibleContexts(state, expandedContexts)
    const visibleContextIds = Object.keys(visibleContexts)

    if (Object.keys(state.expanded).length > 0
    && equalArrays(Object.keys(expandedContexts), Object.keys(lastExpanded))) return

    lastExpanded = expandedContexts

    const listenersToAdd = _.difference(visibleContextIds, Object.keys(thoughtListeners))
    const listenersToRemove = _.difference(Object.keys(thoughtListeners), visibleContextIds)

    const refsToAdd: Index<Ref> = listenersToAdd.reduce((acc, id) => {
      const url = `users/${state.user!.uid}/contextIndex/${id}`
      return { ...acc, [id]: window.firebase?.database().ref(url) }
    }, {} as Index<Ref>)

    const refsToRemove = listenersToRemove.reduce((acc, id) => {
      return { ...acc, [id]: thoughtListeners[id] }
    }, {} as Index<Ref>)
    const provider = getFirebaseProvider(getState(), dispatch)

    Object.keys(refsToRemove).forEach(id => {
      refsToRemove[id]?.off('value')
    })

    Object.keys(refsToAdd).forEach(id => {

      refsToAdd[id]?.on('value', _.debounce(async snapshot => {

        const state = getState()

        const remoteState: Parent = snapshot.val()

        if (!remoteState || refsToRemove[id]) return

        const contexts: Context[] = remoteState.children.map(child => [...remoteState.context, child.value])
        const thoughtIds = contexts.map(context => hashThought(head(context)))

        const thoughtPromises = thoughtIds.map(id => provider.getThoughtById(id))

        thoughts = await Promise.all(thoughtPromises)
        const thoughtindex: Index<Lexeme> = thoughts.reduce((acc, thought, i) => {
          return { ...acc, ...thought ? { [thoughtIds[i]]: { ...thought, id: thoughtIds[i] } } : false }
        }, {})

        if (Object.keys(thoughtindex).length !== thoughtIds.length) {
          // Couldn't fetch all thoughts
          return
        }

        dispatch(reconcile({ thoughtsResults: [state.thoughts, {
          thoughtIndex: thoughtindex,
          contextIndex: { [id]: remoteState },
          thoughtCache: [],
          contextCache: []
        }] }))

      }, 500))

    })

    thoughtListeners = _.omit({ ...thoughtListeners, ...refsToAdd }, listenersToRemove)

  }
}

export default remoteSyncMiddleware
