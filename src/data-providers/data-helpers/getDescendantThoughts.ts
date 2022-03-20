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
const isUnbuffered = (state: State, thought: Thought) => {
  // Note: Since thought does not have context and we have to generate context from available state. May not work as intended if the we pull a thought whose ancestors has not been pulled yet.
  const context = getContextForThought(state, thought.id)

  // @MIGRATION_TODO: Is it okay to prevent buffering if context is not found ?
  if (!context) {
    console.warn(`isUnbuffered: Context not found for thought ${thought.id}`)
    return false
  }

  return (
    thought.children.length === 0 ||
    context.includes(EM_TOKEN) ||
    (context.find(isFunction) && !context.includes('=archive'))
  )
}

/**
 * Returns buffered lexemeIndex and thoughtIndex for all descendants using async iterables.
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

  let accumulatedThoughtIndex = state.thoughts.thoughtIndex

  // eslint-disable-next-line fp/no-loops
  while (pullThoughtIds.length > 0) {
    // TODO: Find better way to remove null from the type here.
    const providerParents = (await provider.getThoughtsByIds(pullThoughtIds)).filter(Boolean) as Thought[]

    // all pulled thought entries
    const pulledThoughtIndex = keyValueBy(pullThoughtIds, (id, i) => {
      return { [id]: providerParents[i] }
    })

    accumulatedThoughtIndex = {
      ...accumulatedThoughtIndex,
      ...pulledThoughtIndex,
    }

    const updatedState: State = {
      ...state,
      thoughts: {
        ...state.thoughts,
        thoughtIndex: accumulatedThoughtIndex,
      },
    }

    const thoughts =
      currentMaxDepth > 0
        ? providerParents
        : providerParents.map(thought => ({
            ...thought,
            ...(!isUnbuffered(updatedState, thought)
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
    const thoughtIndex = keyValueBy(pullThoughtIds, (id, i) => {
      return { [id]: thoughts[i] }
    })

    const thoughtHashes = pullThoughtIds.map(id => {
      const thought = getThoughtById(updatedState, id)
      if (!thought) {
        throw new Error(`Thought not found for id${id}`)
      }
      return hashThought(thought.value)
    })

    const lexemes = await provider.getLexemesByIds(thoughtHashes)

    const lexemeIndex = keyValueBy(thoughtHashes, (id, i) => (lexemes[i] ? { [id]: lexemes[i]! } : null))

    const thoughtsIndices = {
      thoughtIndex,
      lexemeIndex,
    }

    // enqueue children
    pullThoughtIds = thoughts.map(thought => thought.children).flat()

    // yield thought
    yield thoughtsIndices

    currentMaxDepth--
  }
}

export default getDescendantThoughts
