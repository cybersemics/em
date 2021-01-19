import _ from 'lodash'
import { EM_TOKEN } from '../../constants'
import { DataProvider } from '../DataProvider'
import { hashContext, hashThought, head, isFunction, keyValueBy, never, unroot } from '../../util'
import { Context, Index, Parent, ThoughtsInterface } from '../../types'

const MAX_DEPTH = 100

interface Options {
  maxDepth?: number,
}

/** Returns a getter function that accesses a property on an object. */
const prop = (name: string) => <T>(x: Index<T>) => x[name]

/**
 * Returns true if the Parent should not be buffered for any of the following reasons:
 *
 * - Parent has no children.
 * - Context contains the em context.
 * - Context has a non-archive metaprogramming attribute.
 */
const isUnbuffered = (parent: Parent) =>
  parent.children.length === 0 ||
  parent.context.includes(EM_TOKEN) ||
  (parent.context.find(isFunction) && !parent.context.includes('=archive'))

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
      // eslint-disable-next-line no-loop-func
      .map((parent, i) => ({
        id: hashContext(contexts[i]),
        children: parent?.children || [],
        lastUpdated: never(),
        ...parent,
        // fill in context if not defined
        context: parent?.context || contexts[i] || context,
      }))

    const parents = currentMaxDepth > 0
      ? providerParents
      : providerParents.map(parent => ({
        ...parent,
        ...!isUnbuffered(parent) ? {
          children: parent.children
            .filter(_.flow(prop('value'), isFunction)),
          lastUpdated: never(),
          pending: true,
        } : null
      }))

    const thoughtIds = contexts.map(cx => hashThought(head(cx)))
    const lexemes = await provider.getThoughtsByIds(thoughtIds)

    const contextIndex = keyValueBy(contextIds, (id, i) => {
      // exclude non-pending leaves
      return parents[i].children?.length > 0 || parents[i].pending
        ? { [id]: parents[i] }
        : null
    })
    const thoughtIndex = keyValueBy(thoughtIds, (id, i) =>
      lexemes[i]
        ? { [id]: lexemes[i]! }
        : null
    )

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
