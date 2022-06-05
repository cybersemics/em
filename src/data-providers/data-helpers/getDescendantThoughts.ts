import { EM_TOKEN } from '../../constants'
import { DataProvider } from '../DataProvider'
import { hashThought, keyValueBy, never } from '../../util'
// import { getSessionId } from '../../util/sessionManager'
import { Thought, State, ThoughtId, ThoughtsInterface } from '../../@types'
import { getThoughtById } from '../../selectors'
import { getSessionId } from '../../util/sessionManager'

const MAX_DEPTH = 100

interface Options {
  maxDepth?: number
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
  getState: () => State,
  { maxDepth = MAX_DEPTH }: Options = {},
): AsyncIterable<ThoughtsInterface> {
  // use queue for breadth-first search
  let thoughtIdQueue = [thoughtId] // eslint-disable-line fp/no-let
  let currentMaxDepth = maxDepth // eslint-disable-line fp/no-let

  const state = getState()
  let accumulatedThoughtIndex = state.thoughts.thoughtIndex

  // eslint-disable-next-line fp/no-loops
  while (thoughtIdQueue.length > 0) {
    // thoughts may be missing, such as __ROOT__ on first load, or deleted ids
    // filter out the missing thought ids and proceed as usual
    const providerThoughtsRaw = await provider.getThoughtsByIds(thoughtIdQueue)
    const thoughtIdsValidated = thoughtIdQueue.filter((value, i) => providerThoughtsRaw[i])
    const providerThoughtsValidated = providerThoughtsRaw.filter(Boolean) as Thought[]

    // all pulled thought entries
    const pulledThoughtIndex = keyValueBy(thoughtIdsValidated, (id, i) => {
      return { [id]: providerThoughtsValidated[i] }
    })

    accumulatedThoughtIndex = {
      ...accumulatedThoughtIndex,
      ...pulledThoughtIndex,
    }

    const state = getState()
    const updatedState: State = {
      ...state,
      thoughts: {
        ...state.thoughts,
        thoughtIndex: accumulatedThoughtIndex,
      },
    }

    const thoughts =
      currentMaxDepth > 0
        ? providerThoughtsValidated
        : providerThoughtsValidated.map(thought => ({
            ...thought,
            // set thoughts with children as pending
            // do not include descendants of EM
            // TODO: Should we exclude descendants of functions? How to check without a slow call to contextToThought?
            ...(thoughtId !== EM_TOKEN && Object.keys(thought.childrenMap || {}).length > 0
              ? {
                  childrenMap: {},
                  lastUpdated: never(),
                  updatedBy: getSessionId(),
                  pending: true,
                }
              : null),
          }))

    // Note: Since Parent.children is now array of ids instead of Child we need to inclued the non pending leaves as well.
    const thoughtIndex = keyValueBy(thoughtIdsValidated, (id, i) => ({ [id]: thoughts[i] }))

    const thoughtHashes = thoughtIdsValidated.map(id => {
      const thought = getThoughtById(updatedState, id)
      if (!thought) {
        throw new Error(`Thought not found for id${id}`)
      }
      return hashThought(thought.value)
    })

    const lexemes = await provider.getLexemesByIds(thoughtHashes)

    const lexemeIndex = keyValueBy(thoughtHashes, (id, i) => (lexemes[i] ? { [id]: lexemes[i]! } : null))

    // enqueue children
    thoughtIdQueue = thoughts.map(thought => Object.values(thought.childrenMap || {})).flat()

    yield {
      thoughtIndex,
      lexemeIndex,
    }

    currentMaxDepth--
  }
}

export default getDescendantThoughts
