import { EM_TOKEN } from '../../constants'
import { DataProvider } from '../DataProvider'
import { hashThought, isFunction, keyValueBy, never } from '../../util'
// import { getSessionId } from '../../util/sessionManager'
import { Thought, State, ThoughtId, ThoughtsInterface } from '../../@types'
import { getContextForThought, getThoughtById } from '../../selectors'
import { getSessionId } from '../../util/sessionManager'

const MAX_DEPTH = 100

interface Options {
  maxDepth?: number
}

/**
 * Returns true if the Parent should not be buffered for any of the following reasons:
 *
 * - Parent has no children.
 * - Context contains the em context.
 * - Context has a non-archive metaprogramming attribute.
 */
const isUnbuffered = (state: State, parent: Thought) => {
  // Note: Since parent does not have context and we have to generate context from available state. May not work as intended if the we pull a thought whose ancestors has not been pulled yet.
  const context = getContextForThought(state, parent.id)

  // @MIGRATION_TODO: Is it okay to prevent buffering if context is not found ?
  if (!context) {
    console.warn(`isUnbuffered: Context not found for thought ${parent.id}`)
    return false
  }

  return (
    parent.children.length === 0 ||
    context.includes(EM_TOKEN) ||
    (context.find(isFunction) && !context.includes('=archive'))
  )
}

/**
 * Returns buffered thoughtIndex and contextIndex for all descendants using async iterables.
 *
 * @param context
 * @param children
 * @param maxDepth    The maximum number of levels to traverse. When reached, adds pending: true to the returned Parent. Ignored for EM context. Default: 100.
 */
async function* getDescendantThoughts(
  provider: DataProvider,
  thoughtId: ThoughtId,
  state: State,
  { maxDepth = MAX_DEPTH }: Options = {},
): AsyncIterable<ThoughtsInterface> {
  // use queue for breadth-first search
  let pullThoughtIds = [thoughtId] // eslint-disable-line fp/no-let
  let currentMaxDepth = maxDepth // eslint-disable-line fp/no-let

  let accumulatedContextIndex = state.thoughts.contextIndex

  // eslint-disable-next-line fp/no-loops
  while (pullThoughtIds.length > 0) {
    // TODO: Find better way to remove null from the type here.
    const providerParents = (await provider.getContextsByIds(pullThoughtIds)).filter(Boolean) as Thought[]

    if (providerParents.length < pullThoughtIds.length) {
      console.error(`getDescendantThoughts: Cannot get parent for some ids.`, pullThoughtIds, providerParents)
      yield {
        contextIndex: {},
        thoughtIndex: {},
      }
      return
    }

    // all pulled parent entries
    const pulledContextIndex = keyValueBy(pullThoughtIds, (id, i) => {
      return { [id]: providerParents[i] }
    })

    accumulatedContextIndex = {
      ...accumulatedContextIndex,
      ...pulledContextIndex,
    }

    const updatedState: State = {
      ...state,
      thoughts: {
        ...state.thoughts,
        contextIndex: accumulatedContextIndex,
      },
    }

    const parents =
      currentMaxDepth > 0
        ? providerParents
        : providerParents.map(parent => ({
            ...parent,
            ...(!isUnbuffered(updatedState, parent)
              ? {
                  // @MIGRATION_TODO: Previouss implementaion kept the meta children. But now we cannot determine the meta children just by id, without pulling the data from the db.
                  children: [],
                  lastUpdated: never(),
                  updatedBy: getSessionId(),
                  pending: true,
                }
              : null),
          }))

    // Note: Since Parent.children is now array of ids instead of Child we need to inclued the non pending leaves as well.
    const contextIndex = keyValueBy(pullThoughtIds, (id, i) => {
      return { [id]: parents[i] }
    })

    const thoughtHashes = pullThoughtIds.map(id => {
      const thought = getThoughtById(updatedState, id)
      if (!thought) {
        throw new Error(`Thought not found for id${id}`)
      }
      return hashThought(thought.value)
    })

    const lexemes = await provider.getThoughtsByIds(thoughtHashes)

    const thoughtIndex = keyValueBy(thoughtHashes, (id, i) => (lexemes[i] ? { [id]: lexemes[i]! } : null))

    const thoughts = {
      contextIndex,
      thoughtIndex,
    }

    // enqueue children
    pullThoughtIds = parents.map(parent => parent.children).flat()

    // yield thought
    yield thoughts

    currentMaxDepth--
  }
}

export default getDescendantThoughts
