import _ from 'lodash'
import { EM_TOKEN } from '../../constants'
import { DataProvider } from '../DataProvider'
import { ThoughtsInterface } from '../../util/initialState'
import { hashContext, hashThought, head, isFunction, never, unroot } from '../../util'
import getContext from './getContext'
import getThought from './getThought'
import { Context, Index, Lexeme, Parent } from '../../types'

const MAX_DEPTH = 100

interface Options {
  maxDepth?: number,
}

/** Returns a getter function that accesses a property on an object. */
const prop = (name: string) => <T>(x: Index<T>) => x[name]

/** Gets a Parent from the provider. Returns a pending Parent if maxDepth is reached. */
const getParentBuffered = async (provider: DataProvider, context: Context, { maxDepth = MAX_DEPTH }: Options) => {

  // get the Parent from the provider
  const parent = await getContext(provider, context) || {
    id: hashContext(context),
    context,
    children: [],
    lastUpdated: never(),
  }

  // if we have reached the maximum depth, set the Parent to pending and only load metaprogramming attributes
  return maxDepth > 0
    ? parent
    : {
      ...parent,
      children: (parent.children || [])
        .filter(_.flow(prop('value'), isFunction)),
      lastUpdated: never(),
      pending: true,
    }
}

/** Wraps a Parent and Lexeme in a ThoughtsInterface. */
const chunkThoughts = (parent: Parent, lexeme?: Lexeme): ThoughtsInterface => {

  const contextEncoded = hashContext(parent.context)
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

  return thoughts
}

/**
 * Returns buffered thoughtIndex and contextIndex for all descendants using async iterables.
 *
 * @param context
 * @param children
 * @param maxDepth    The maximum number of levels to traverse. When reached, adds pending: true to the returned Parent. Ignored for EM context. Default: 100.
 */
async function* getDescendantThoughts(provider: DataProvider, context: Context, { maxDepth = MAX_DEPTH }: Options = {}): AsyncIterable<ThoughtsInterface> {

  // use queue for breadth-first search
  let queue = [context] // eslint-disable-line fp/no-let
  let currentMaxDepth = maxDepth // eslint-disable-line fp/no-let

  // eslint-disable-next-line fp/no-loops
  while (queue.length > 0) {

    // eslint-disable-next-line fp/no-mutating-methods
    const currentContext = queue.shift() as Context

    // no buffering on em context or metaprogramming attributes
    if (isFunction(head(currentContext)) || currentContext.includes(EM_TOKEN)) {
      currentMaxDepth = MAX_DEPTH
    }

    const parent = await getParentBuffered(provider, currentContext, { maxDepth: currentMaxDepth })
    const lexeme = await getThought(provider, head(currentContext))
    const thoughts = chunkThoughts(parent, lexeme)

    // yield thought
    yield thoughts

    // enqueue children
    const childrenContexts = (parent.children || []).map(child => unroot([...currentContext, child.value]))
    queue = [...queue, ...childrenContexts]
    currentMaxDepth--
  }
}

export default getDescendantThoughts
