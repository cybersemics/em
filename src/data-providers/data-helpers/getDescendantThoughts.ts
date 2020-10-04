import _ from 'lodash'
import { ID } from '../../constants'
import { Context, Lexeme, Parent } from '../../types'
import { GenericObject } from '../../utilTypes'
import { DataProvider } from '../DataProvider'
import { ThoughtsInterface } from '../../util/initialState'
import { hashContext, hashThought, never, unroot, yieldAll } from '../../util'
import getContext from './getContext'

/**
 * Returns buffered thoughtIndex and contextIndex for all descendants using async iterables.
 *
 * @param context
 * @param children
 * @param maxDepth    The maximum number of levels to traverse. When reached, adds pending: true to the returned Parent. Ignored for EM context. Default: 100.
 */
async function* getDescendantThoughts(provider: DataProvider, context: Context, { maxDepth = 100, parentEntry }: { maxDepth?: number, parentEntry?: Parent } = {}): AsyncIterable<ThoughtsInterface> {

  const contextEncoded = hashContext(context)

  // fetch individual parentEntry in initial call
  // recursive calls on children will pass the parentEntry fetched in batch by getContextsByIds
  parentEntry = parentEntry || await getContext(provider, context) || {
    context,
    children: [],
    lastUpdated: never(),
  }

  if (maxDepth === 0) {
    yield {
      contextCache: [],
      contextIndex: {
        [contextEncoded]: {
          context,
          children: [],
          // TODO: Why not return the children if we already have them?
          // ...parentEntry,
          lastUpdated: never(),
          pending: true,
        }
      },
      thoughtCache: [],
      thoughtIndex: {}
    }
    return
  }

  // generate a list of hashed thoughts and a map of contexts { [hash]: context } for all children
  // must save context map instead of just list of hashes for the recursive call
  // @ts-ignore
  const { thoughtIds, contextMap }: {
    thoughtIds: string[],
    contextMap: GenericObject<Context>,
  } = (parentEntry.children || []).reduce((accum, child) => ({
    thoughtIds: [
      ...accum.thoughtIds || [],
      hashThought(child.value),
    ],
    contextMap: {
      ...accum.contextMap,
      [hashContext(unroot([...context, child.value]))]: unroot([...context, child.value]),
    }
  }), {
    thoughtIds: [] as string[],
    contextMap: {} as GenericObject<Context>,
  })

  const contextIds = Object.keys(contextMap)
  const thoughtList = (await provider.getThoughtsByIds(thoughtIds)).filter(ID) as Lexeme[]
  const parentEntries = (await provider.getContextsByIds(contextIds)).filter(ID) as Parent[]

  const thoughts = {
    contextCache: contextIds,
    contextIndex: {
      [contextEncoded]: parentEntry,
      ..._.keyBy(parentEntries, 'id')
    },
    thoughtCache: thoughtIds,
    thoughtIndex: _.keyBy(thoughtList, 'id')
  }

  yield thoughts

  yield* yieldAll(parentEntries.map(parentEntry =>
    getDescendantThoughts(provider, contextMap[parentEntry.id!], { maxDepth: maxDepth - 1, parentEntry })
  ))
}

export default getDescendantThoughts
