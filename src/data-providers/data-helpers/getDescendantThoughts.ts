import _ from 'lodash'
import { EM_TOKEN } from '../../constants'
import { DataProvider } from '../DataProvider'
import { ThoughtsInterface } from '../../util/initialState'
import { hashContext, hashThought, head, isFunction, keyValueBy, never, unroot } from '../../util'
import { Context, Index } from '../../types'

const MAX_DEPTH = 100

interface Options {
  maxDepth?: number,
}

/** Returns a getter function that accesses a property on an object. */
const prop = (name: string) => <T>(x: Index<T>) => x[name]

/** Returns true if a context contains a non-archive metaprogramming attribute. */
const hasNonArchiveMeta = (context: Context) =>
  context.find(isFunction) && !context.includes('=archive')

/** Returns true if a context contains the em context or has a non-archive metaprogramming attribute and thus should not be buffered. */
const isUnbuffered = (context: Context) =>
  context.includes(EM_TOKEN) || hasNonArchiveMeta(context)

/**
 * Returns buffered thoughtIndex and contextIndex for all descendants using async iterables.
 *
 * @param context
 * @param children
 * @param maxDepth    The maximum number of levels to traverse. When reached, adds pending: true to the returned Parent. Ignored for EM context. Default: 100.
 */
async function* getDescendantThoughts(provider: DataProvider, context: Context, { maxDepth = MAX_DEPTH }: Options = {}): AsyncIterable<ThoughtsInterface> {

  // use queue for breadth-first search
  let contexts = [context] // eslint-disable-line fp/no-let
  let currentMaxDepth = maxDepth // eslint-disable-line fp/no-let

  // eslint-disable-next-line fp/no-loops
  while (contexts.length > 0) {

    const contextIds = contexts.map(cx => hashContext(cx))
    const providerParents = (await provider.getContextsByIds(contextIds))
      .map((parent, i) => parent || {
        id: hashContext(contexts[i]),
        context: contexts[i],
        children: [],
        lastUpdated: never(),
      })

    const parents = currentMaxDepth > 0
      ? providerParents
      : providerParents.map(parent => ({
        ...parent,
        ...!isUnbuffered(parent.context) ? {
          children: (parent.children || [])
            .filter(_.flow(prop('value'), isFunction)),
          lastUpdated: never(),
          pending: true,
        } : null
      }))

    const thoughtIds = contexts.map(cx => hashThought(head(cx)))
    const lexemes = await provider.getThoughtsByIds(thoughtIds)

    const contextIndex = keyValueBy(contextIds, (id, i) => ({ [id]: parents[i] }))
    const thoughtIndex = keyValueBy(thoughtIds, (id, i) => lexemes[i] ? { [id]: lexemes[i]! } : null)

    const thoughts = {
      contextCache: contextIds,
      contextIndex,
      thoughtCache: thoughtIds,
      thoughtIndex,
    }

    // enqueue children
    contexts = parents.map(parent =>
      parent.children.map(child => unroot([...parent.context, child.value]))
    ).flat()

    // yield thought
    yield thoughts

    currentMaxDepth--
  }
}

export default getDescendantThoughts
