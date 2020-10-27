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

  const parentEntry = maxDepth === 0 ? {
    id: hashContext(context),
    context,
    children: [],
    lastUpdated: never(),
    pending: true,
  } : await getContext(provider, context) || {
    id: hashContext(context),
    context,
    children: [],
    lastUpdated: never(),
  }

  const lexeme = await getThought(provider, head(context))
  const lexemeEncoded = lexeme ? hashThought(lexeme.value) : null

  const thoughts = {
    contextCache: [contextEncoded],
    contextIndex: {
      [contextEncoded]: parentEntry,
    },
    thoughtCache: lexeme ? [lexemeEncoded!] : [],
    thoughtIndex: lexeme ? {
      [lexemeEncoded!]: lexeme
    } : {},
  }

  yield thoughts

  if (maxDepth > 0) {
    yield* yieldAll((parentEntry.children || [])
      .map(child =>
        getDescendantThoughts(provider, unroot([...context, child.value]), { maxDepth: maxDepth - 1 })
      ))
  }
}

export default getDescendantThoughts
