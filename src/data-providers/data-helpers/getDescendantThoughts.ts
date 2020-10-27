import _ from 'lodash'
import { DataProvider } from '../DataProvider'
import { ThoughtsInterface } from '../../util/initialState'
import { hashContext, hashThought, head, isFunction, never, unroot, yieldAll } from '../../util'
import getContext from './getContext'
import getThought from './getThought'
import { Context, Index, Parent } from '../../types'

const MAX_DEPTH = 100

/** Returns a getter function that accesses a property on an object. */
const prop = (name: string) => <T>(x: Index<T>) => x[name]

/**
 * Returns buffered thoughtIndex and contextIndex for all descendants using async iterables.
 *
 * @param context
 * @param children
 * @param maxDepth    The maximum number of levels to traverse. When reached, adds pending: true to the returned Parent. Ignored for EM context. Default: 100.
 */
async function* getDescendantThoughts(provider: DataProvider, context: Context, { maxDepth = MAX_DEPTH }: { maxDepth?: number, parentEntry?: Parent } = {}): AsyncIterable<ThoughtsInterface> {

  const contextEncoded = hashContext(context)

  // get the Parent from the provider
  const providerParent = await getContext(provider, context) || {
    id: hashContext(context),
    context,
    children: [],
    lastUpdated: never(),
  }

  // if we have reached the maximum depth, set the Parent to pending and only load metaprogramming attributes
  const parent = maxDepth > 0
    ? providerParent
    : {
      ...providerParent,
      children: (providerParent.children || [])
        .filter(_.flow(prop('value'), isFunction)),
      lastUpdated: never(),
      pending: true,
    }

  const lexeme = await getThought(provider, head(context))
  const lexemeEncoded = lexeme ? hashThought(lexeme.value) : null

  const thoughts = {
    contextCache: [contextEncoded],
    contextIndex: {
      [contextEncoded]: parent,
    },
    thoughtCache: lexeme ? [lexemeEncoded!] : [],
    thoughtIndex: lexeme ? {
      [lexemeEncoded!]: lexeme
    } : {},
  }

  yield thoughts

  yield* yieldAll((parent.children || []).map(child =>
    getDescendantThoughts(provider, unroot([...context, child.value]), {
      // get all metaprogramming descendants
      maxDepth: maxDepth === 0 ? MAX_DEPTH : maxDepth - 1
    })
  ))
}

export default getDescendantThoughts
