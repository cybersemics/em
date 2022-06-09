import { EM_TOKEN, EXPAND_THOUGHT_CHAR } from '../../constants'
import { DataProvider } from '../DataProvider'
import { hashThought, hashPath, isFunction, keyValueBy, never } from '../../util'
// import { getSessionId } from '../../util/sessionManager'
import { Thought, State, ThoughtId, ThoughtsInterface } from '../../@types'
import { getThoughtById, thoughtToPath } from '../../selectors'
import { getAncestorBy } from '../../selectors/getAncestorByValue'
import { getSessionId } from '../../util/sessionManager'

const MAX_DEPTH = 100
const MAX_THOUGHTS_QUEUED = 100

interface Options {
  maxDepth?: number
}

/** A very simple queue. */
const queue = <T>(initialValue: T[] = []) => {
  let list: T[] = [...initialValue]

  // the total number of thoughts that have been queued
  let total = 0

  return {
    add: (values: T[]) => {
      list = [...list, ...values]
      total += values.length
    },
    clear: () => {
      list = []
    },
    get: () => [...list],
    size: () => list.length,
    total: () => total,
  }
}

/** A very simple counter. */
const counter = (initialValue = 0) => {
  let n = initialValue
  return {
    get: () => n,
    inc: (step = 1) => {
      n += step
      return n
    },
  }
}

/** Returns true if a Thought is a meta attribute but not =archive. */
const isUnarchivedAttribute = (thought: Thought) => isFunction(thought.value) && thought.value !== '=archive'

/** Returns true if a Thought is a meta attribute or is a descendant of a meta attribute. Ignores =archive. */
const isMetaDescendant = (state: State, thought: Thought) =>
  isUnarchivedAttribute(thought) || getAncestorBy(state, thought.id, isUnarchivedAttribute)

/** Returns true if a thought is expanded. O(depth) because expanded is keyed by Path. */
const isThoughtExpanded = (state: State, thoughtId: ThoughtId) =>
  !!state.expanded[hashPath(thoughtToPath(state, thoughtId))]

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
  // use queue for breadth-first loading
  const thoughtIdQueue = queue([thoughtId]) // eslint-disable-line fp/no-let
  const depth = counter() // eslint-disable-line fp/no-let

  const accumulatedThoughts = { ...getState().thoughts }

  // eslint-disable-next-line fp/no-loops
  while (thoughtIdQueue.size() > 0) {
    if (thoughtIdQueue.total() > 10000) {
      throw new Error('STOP')
    }
    // thoughts may be missing, such as __ROOT__ on first load, or deleted ids
    // filter out the missing thought ids and proceed as usual
    const providerThoughtsRaw = await provider.getThoughtsByIds(thoughtIdQueue.get())
    const thoughtIdsValidated = thoughtIdQueue.get().filter((value, i) => providerThoughtsRaw[i])
    const providerThoughtsValidated = providerThoughtsRaw.filter(Boolean) as Thought[]
    const pulledThoughtIndex = keyValueBy(thoughtIdsValidated, (id, i) => ({ [id]: providerThoughtsValidated[i] }))
    thoughtIdQueue.clear()

    accumulatedThoughts.thoughtIndex = { ...accumulatedThoughts.thoughtIndex, ...pulledThoughtIndex }

    const updatedState: State = {
      ...getState(),
      thoughts: {
        ...getState().thoughts,
        ...accumulatedThoughts,
      },
    }

    const thoughts = providerThoughtsValidated.map(thought => {
      const childrenIds = Object.values(thought.childrenMap)
      const isEmDescendant = thoughtId === EM_TOKEN
      const hasChildren = Object.keys(thought.childrenMap || {}).length > 0
      const isMaxDepthReached = depth.get() >= maxDepth
      const isMaxThoughtsReached = thoughtIdQueue.total() + childrenIds.length > MAX_THOUGHTS_QUEUED
      const isExpanded = isThoughtExpanded(updatedState, thought.id)
      const parent = getThoughtById(updatedState, thought.parentId)
      const isVisible =
        // we need to check directly for =pin, since it is a sibling and thus not part of accumulatedThoughts yet
        // technically =pin/false is a false positive here, and will cause some thoughts not to be buffered that should, but it is rare
        // we need to determine if this thought should be buffered now, and cannot wait for the =pin child to load
        isExpanded ||
        !!isThoughtExpanded(updatedState, thought.parentId) ||
        !!parent?.childrenMap?.['=pin'] ||
        parent?.value.endsWith(EXPAND_THOUGHT_CHAR)
      const isBuffered =
        (isMaxDepthReached || isMaxThoughtsReached) &&
        hasChildren &&
        !isVisible &&
        !isEmDescendant &&
        !isMetaDescendant(updatedState, thought)

      // once the buffer limit has been reached, set thoughts with children as pending
      // do not buffer descendants of EM
      // do not buffer descendants of functions (except =archive)
      if (isBuffered) {
        // enqueue =pin even if the thought is buffered
        // when =pin/true is loaded, then this thought will be marked as expanded and its children can be loaded
        if (thought.childrenMap?.['=pin']) {
          thoughtIdQueue.add([thought.childrenMap?.['=pin']])
        }
        return {
          ...thought,
          childrenMap: {},
          lastUpdated: never(),
          updatedBy: getSessionId(),
          pending: true,
        }
      } else {
        thoughtIdQueue.add(childrenIds)
        return thought
      }
    })

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

    accumulatedThoughts.thoughtIndex = { ...accumulatedThoughts.thoughtIndex, ...thoughtIndex }
    accumulatedThoughts.lexemeIndex = { ...accumulatedThoughts.lexemeIndex, ...lexemeIndex }

    yield {
      thoughtIndex,
      lexemeIndex,
    }
  }
}

export default getDescendantThoughts
