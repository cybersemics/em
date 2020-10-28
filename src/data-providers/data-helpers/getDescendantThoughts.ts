import _ from 'lodash'
import { DataProvider } from '../DataProvider'
import { ThoughtsInterface } from '../../util/initialState'
import { hashContext, hashThought, head, isFunction, never, unroot, yieldAll } from '../../util'
import getContext from './getContext'
import getThought from './getThought'
import { Context, Index, Lexeme, Parent } from '../../types'

const MAX_DEPTH = 100

interface Options {
  maxDepth?: number,
  parentEntry?: Parent,
}

/** Returns a getter function that accesses a property on an object. */
const prop = (name: string) => <T>(x: Index<T>) => x[name]

/** Gets a Parent from the provider. Returns a pending Parent if maxDepth is reached. */
const getParentBuffered = async (provider: DataProvider, context: Context, { maxDepth }: { maxDepth: number }) => {

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
async function* getDescendantThoughts(provider: DataProvider, context: Context, { maxDepth = MAX_DEPTH, parentEntry }: Options = {}): AsyncIterable<ThoughtsInterface> {

  const parent = parentEntry || await getParentBuffered(provider, context, { maxDepth })
  const lexeme = await getThought(provider, head(context))
  const thoughts = chunkThoughts(parent, lexeme)

  // yield thought
  if (!parentEntry) {
    yield thoughts
  }

  // yield children before traversing descendants for breadth-first traversal
  yield* yieldAll((parent.children || []).map(async function* (child) {

    const childContext = unroot([...context, child.value])
    const parent = await getParentBuffered(provider, childContext, { maxDepth: maxDepth - 1 })
    const lexeme = await getThought(provider, head(childContext))
    const thoughts = chunkThoughts(parent, lexeme)

    yield thoughts

  }))

  // yield descendants
  yield* yieldAll((parent.children || []).map(async function* (child) {

    const childContext = unroot([...context, child.value])
    const parent = await getParentBuffered(provider, childContext, { maxDepth: maxDepth - 1 })

    yield* getDescendantThoughts(provider, childContext, {
      // get all metaprogramming descendants
      maxDepth: maxDepth <= 1 ? MAX_DEPTH : maxDepth - 1,
      parentEntry: parent
    })
  }))
}

export default getDescendantThoughts
