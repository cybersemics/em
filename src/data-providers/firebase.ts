import { Context, Lexeme, ParentEntry } from '../types'
import { hashContext, hashThought, unroot } from '../util'
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
  return await parentEntry.children.reduce(async (thoughts: any, child: any) => {
    const thoughtEncoded = hashThought(child.value)
    const thought = await getThought(userId, child.value) // TODO: Cache thoughts that have already been loaded
    const contextChild = unroot([...context, child.value])

    // RECURSION
    const nextDescendantThoughts = await getDescendantThoughts(userId, contextChild, { maxDepth: maxDepth - 1 })

    return {
      // merge descendant contextIndex
      contextIndex: {
        ...(await thoughts).contextIndex,
        ...nextDescendantThoughts.contextIndex
      },
      // merge descendant thoughtIndex and add child thought
      thoughtIndex: {
        ...(await thoughts).thoughtIndex,
        [thoughtEncoded]: thought,
        ...nextDescendantThoughts.thoughtIndex
      }
    }
  }, initialThoughts)
}
