import { Context, Parent } from '../../types'
import { DataProvider } from '../DataProvider'
import { ThoughtsInterface } from '../../util/initialState'
import { hashContext, hashThought, head, never, unroot, yieldAll } from '../../util'
import getContext from './getContext'
import getThought from './getThought'

/**
 * Returns buffered thoughtIndex and contextIndex for all descendants using async iterables.
 *
 * @param context
 * @param children
 * @param maxDepth    The maximum number of levels to traverse. When reached, adds pending: true to the returned Parent. Ignored for EM context. Default: 100.
 */
async function* getDescendantThoughts(provider: DataProvider, context: Context, { maxDepth = 100 }: { maxDepth?: number, parentEntry?: Parent } = {}): AsyncIterable<ThoughtsInterface> {

  const contextEncoded = hashContext(context)

  const parentEntry = await getContext(provider, context) || {
    context,
    children: [],
    lastUpdated: never(),
  }

  const lexeme = await getThought(provider, head(context))

  if (maxDepth === 0) {
    yield {
      contextCache: [contextEncoded],
      contextIndex: {
        [contextEncoded]: {
          id: parentEntry.id,
          context,
          children: [],
          // TODO: Why not return the children if we already have them?
          lastUpdated: never(),
          pending: true,
        }
      },
      thoughtCache: lexeme ? [hashThought(lexeme.value)] : [],
      thoughtIndex: {
        ...lexeme ? { [hashThought(lexeme.value)]: lexeme } : null,
      }
    }
    return
  }

  // generate a list of thought and context ids for all children
  const { childrenThoughtIds, childrenContextIds } =
  (parentEntry.children || []).reduce((accum, child) => ({
    childrenThoughtIds: [
      ...accum.childrenThoughtIds || [],
      hashThought(child.value),
    ],
    childrenContextIds: [
      ...accum.childrenContextIds,
      hashContext(unroot([...context, child.value]))
    ]
  }), {
    childrenThoughtIds: [] as string[],
    childrenContextIds: [] as string[],
  })

  const thoughts = {
    contextCache: [contextEncoded, ...childrenContextIds],
    contextIndex: {
      [contextEncoded]: parentEntry,
    },
    thoughtCache: [...lexeme ? [hashThought(lexeme.value)] : [], ...childrenThoughtIds],
    thoughtIndex: {
      ...lexeme ? { [hashThought(lexeme.value)]: lexeme } : null,
    }
  }

  yield thoughts

  yield* yieldAll((parentEntry.children || []).map(child =>
    getDescendantThoughts(provider, unroot([...context, child.value]), { maxDepth: maxDepth - 1 })
  ))
}

export default getDescendantThoughts
