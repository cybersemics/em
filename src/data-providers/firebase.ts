import _ from 'lodash'
import { EM_TOKEN } from '../constants'
import { store } from '../store'
import { Child, Context, Lexeme, ParentEntry, Snapshot } from '../types'
import { GenericObject } from '../utilTypes'
import { hashContext, hashThought, mergeThoughts, never, pathToContext, unroot } from '../util'
import { ThoughtsInterface } from '../util/initialState'

interface Options {
  maxDepth?: number,
}

// hash the EM context once on load
const emContextEncoded = hashContext([EM_TOKEN])

/** Gets the Lexeme object by id. */
export const getThoughtById = async (id: string): Promise<Lexeme> => {
  const { userRef } = store.getState()
  const ref = userRef.child('thoughtIndex').child(id)
  return new Promise(resolve => ref.once('value', (snapshot: Snapshot<Lexeme>) => {
    resolve(snapshot.val())
  }))
}

/** Gets multiple Lexeme objects by ids. */
export const getThoughtsByIds = async (ids: string[]): Promise<Lexeme[]> => {
  const { userRef } = store.getState()
  const snapshots = await Promise.all(
    ids.map(id => userRef.child('thoughtIndex').child(id).once('value'))
  )
  return snapshots.map(snapshot => snapshot.val())
}

/** Gets the Lexeme object of a value. */
export const getThought = async (value: string): Promise<Lexeme> =>
  getThoughtById(hashThought(value))

/**
 * Fetches a ParentEntry of a context.
 *
 * @param context
 */
export const getContext = async (context: Context): Promise<ParentEntry | null> => {
  const { userRef } = store.getState()
  const ref = userRef.child('contextIndex').child(hashContext(context))
  return new Promise(resolve => ref.once('value', (snapshot: Snapshot<ParentEntry>) => {
    resolve(snapshot.val())
  }))
}

/** Gets multiple PrentEntry objects by ids. */
export const getContextsByIds = async (ids: string[]): Promise<ParentEntry[]> => {
  const { userRef } = store.getState()
  const snapshots = await Promise.all(
    ids.map(id => userRef.child('contextIndex').child(id).once('value'))
  )
  return snapshots.map(snapshot => snapshot.val())
}

/** Updates Firebase data. */
export const update = async (updates: GenericObject<any>) => {
  const { userRef } = store.getState()
  return new Promise((resolve, reject) => {
    userRef.update(updates, (err: Error | null, ...args: any[]) => {
      if (err) {
        store.dispatch({ type: 'error', value: err })
        console.error(err, updates)
        reject(err)
      }
      else {
        resolve(args)
      }
    })
  })
}

/** Updates a context in the contextIndex. */
export const updateContext = async (id: string, parentEntry: ParentEntry): Promise<any> =>
  update({
    ['contextIndex/' + id]: parentEntry
  })

/** Updates a thought in the thoughtIndex. */
export const updateThought = async (id: string, thought: Lexeme): Promise<any> =>
  update({
    ['thoughtIndex/' + id]: thought
  })

/** Updates the contextIndex. */
export const updateContextIndex = async (contextIndex: GenericObject<ParentEntry>): Promise<any> =>
  update(Object.entries(contextIndex).reduce((accum, [key, value]) => ({
    ...accum,
    ['contextIndex/' + key]: value,
  }), {}))

/** Updates the thoughtIndex. */
export const updateThoughtIndex = async (thoughtIndex: GenericObject<Lexeme>): Promise<any> =>
  update(Object.entries(thoughtIndex).reduce((accum, [key, value]) => ({
    ...accum,
    ['thoughtIndex/' + key]: value,
  }), {}))

/**
 * Fetches all descendants of a context and returns them within a ThoughtsInterface.
 *
 * @param context
 * @param maxDepth    The maximum number of levels to traverse. When reached, adds pending: true to the returned ParentEntry. Ignored for EM context. Default: 100.Default: 100.
 */
export const getDescendantThoughts = async (context: Context, { maxDepth = 100, parentEntry }: { maxDepth?: number, parentEntry?: ParentEntry } = {}): Promise<ThoughtsInterface> => {

  const contextEncoded = hashContext(context)

  // fetch individual parentEntry in initial call
  // recursive calls on children will pass the parentEntry fetched in batch by getContextsByIds
  parentEntry = parentEntry || await getContext(context) || {
    children: [],
    lastUpdated: never(),
  }
  if (maxDepth === 0) {
    return {
      contextIndex: {
        [contextEncoded]: {
          children: [],
          // TODO: Why not return the children if we already have them?
          // ...parentEntry,
          lastUpdated: never(),
          pending: true,
        }
      },
      thoughtIndex: {}
    }
  }

  // generate a list of hashed thoughts and a map of contexts { [hash]: context } for all children
  // must save context map instead of just list of hashes for the recursive call
  const { thoughtIds, contextMap } = (parentEntry.children || []).reduce((accum: { thoughtIds: string[], contextMap: GenericObject<Context> }, child: Child) => ({
    thoughtIds: [
      ...accum.thoughtIds || [],
      hashThought(child.value),
    ],
    contextMap: {
      ...accum.contextMap,
      [hashContext(unroot([...context, child.value]))]: unroot([...context, child.value]),
    }
  }), { thoughtIds: [], contextMap: {} })

  const contextIds = Object.keys(contextMap)

  const thoughtList = await getThoughtsByIds(thoughtIds)
  const parentEntries = await getContextsByIds(contextIds)

  const thoughts = {
    contextIndex: {
      [contextEncoded]: parentEntry,
      ..._.keyBy(parentEntries, 'id')
    },
    // not all lexemes have ids
    thoughtIndex: thoughtIds.reduce((accum, key, i) => ({
      ...accum,
      [key]: thoughtList[i]
    }), {})
  }

  const descendantThoughts = await Promise.all(parentEntries.map((parentEntry: ParentEntry, i: number) =>
    getDescendantThoughts(contextMap[contextIds[i]], { maxDepth: maxDepth - 1, parentEntry })
  ))

  const descendantThoughtsMerged = mergeThoughts(thoughts, ...descendantThoughts)

  return descendantThoughtsMerged
}

/** Gets descendants of many contexts, returning them a single ThoughtsInterface. */
export const getManyDescendants = async (contextMap: GenericObject<Context>, { maxDepth = 100 }: Options = {}): Promise<ThoughtsInterface> => {

  // fetch descendant thoughts for each context in contextMap
  const descendantsArray = await Promise.all(Object.keys(contextMap).map(key =>
    getDescendantThoughts(pathToContext(contextMap[key]), {
      // do not limit the depth of the em context
      maxDepth: key === emContextEncoded ? Infinity : maxDepth
    })
  ))

  // aggregate thoughts from all descendants
  const thoughts = descendantsArray.reduce((accum, thoughts) => mergeThoughts(accum, thoughts), { contextIndex: {}, thoughtIndex: {} })

  return thoughts
}
