import { Context, Lexeme, ParentEntry } from '../types'
import { hashContext, hashThought, mergeThoughts, pathToContext, unroot } from '../util'
import { ThoughtsInterface } from '../util/initialState'

interface Options {
  maxDepth?: number,
}

type Snapshot<T = any> = {
  val: () => T,
}

/** Gets the Lexeme object of a value. */
export const getThought = async (userId: string, value: string): Promise<Lexeme> => {
  const ref = window.firebase.database().ref(`users/${userId}/thoughtIndex/${hashThought(value)}`)
  return new Promise(resolve => ref.once('value', (snapshot: Snapshot<Lexeme>) => {
    resolve(snapshot.val())
  }))
}

/**
 * Fetches a ParentEntry of a context.
 *
 * @param context
 */
export const getContext = async (userId: string, context: Context): Promise<ParentEntry> => {
  const ref = window.firebase.database().ref(`users/${userId}/contextIndex/${hashContext(context)}`)
  return new Promise(resolve => ref.once('value', (snapshot: Snapshot<ParentEntry>) => {
    resolve(snapshot.val())
  }))
}

/**
 * Fetches all descendants of a context and returns them within a ThoughtsInterface.
 *
 * @param context
 * @param maxDepth    The maximum number of levels to traverse. Default: 100.
 */
export const getDescendantThoughts = async (userId: string, context: Context, { maxDepth = 100 }: Options = {}): Promise<ThoughtsInterface> => {

  if (maxDepth === 0) return { contextIndex: {}, thoughtIndex: {} }

  const parentEntry: ParentEntry = maxDepth > 0
    ? await getContext(userId, context) || {
      children: [],
      lastUpdated: ''
    }
    : {
      children: [],
      lastUpdated: '',
      pending: true,
    }

  // initially set the contextIndex for the given context
  // if there are no children, still set this so that pending is overwritten
  const initialThoughts = {
    contextIndex: {
      [hashContext(context)]: parentEntry
    },
    thoughtIndex: {},
  }

  // recursively iterate over each child
  // @ts-ignore
  return await parentEntry.children.reduce(async (thoughtsPromise: Promise<ThoughtsInterface>, child: Child) => {
    const thoughts = await thoughtsPromise
    const thoughtEncoded = hashThought(child.value)
    const thought = await getThought(userId, child.value) // TODO: Cache thoughts that have already been loaded
    const contextChild = unroot([...context, child.value])

    // RECURSION
    const nextDescendantThoughts = await getDescendantThoughts(userId, contextChild, { maxDepth: maxDepth - 1 })

    return {
      // merge descendant contextIndex
      contextIndex: {
        ...thoughts.contextIndex,
        ...nextDescendantThoughts.contextIndex
      },
      // merge descendant thoughtIndex and add child thought
      thoughtIndex: {
        ...thoughts.thoughtIndex,
        [thoughtEncoded]: thought,
        ...nextDescendantThoughts.thoughtIndex
      }
    }
  }, initialThoughts)
}

/** Gets descendants of many contexts, returning them a single ThoughtsInterface. */
export const getManyDescendants = async (userId: string, contextMap: any, { maxDepth = 100 }: Options = {}): Promise<ThoughtsInterface> => {

  // fetch descendant thoughts for each context in contextMap
  const descendantsArray = await Promise.all(Object.keys(contextMap).map(key =>
    getDescendantThoughts(userId, pathToContext(contextMap[key]), { maxDepth })
  ))

  // aggregate thoughts from all descendants
  const thoughts = descendantsArray.reduce(mergeThoughts, { contextIndex: {}, thoughtIndex: {} })

  return thoughts
}
