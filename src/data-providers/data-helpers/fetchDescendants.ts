import Index from '../../@types/IndexType'
import State from '../../@types/State'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import ThoughtIndices from '../../@types/ThoughtIndices'
import { EM_TOKEN, EXPAND_THOUGHT_CHAR, ROOT_PARENT_ID } from '../../constants'
import { getAncestorBy } from '../../selectors/getAncestorByValue'
import getThoughtById from '../../selectors/getThoughtById'
import thoughtToPath from '../../selectors/thoughtToPath'
import hashPath from '../../util/hashPath'
import hashThought from '../../util/hashThought'
import head from '../../util/head'
import isAttribute from '../../util/isAttribute'
import keyValueBy from '../../util/keyValueBy'
import never from '../../util/never'
import nonNull from '../../util/nonNull'
import { DataProvider } from '../DataProvider'
import { clientId } from '../yjs'

// default maxDepth before thoughts become pending
const MAX_DEPTH = 100

// number of total thoughts that be be pulled before additional thoughts are marked pending
const MAX_THOUGHTS_QUEUED = 100

/** A very simple queue. */
const queue = <T>(initialValue: T[] = []) => {
  let list: T[] = [...initialValue]

  // the total number of thoughts that have been queued
  let total = 0

  return {
    /** Adds one or more items to the queue and updates the total count. */
    add: (values: T[]) => {
      list = [...list, ...values]
      total += values.length
    },
    list: () => [...list],
    /** Gets the full contents of the queue and clears it. */
    next: () => {
      const copy = [...list]
      list = []
      return copy
    },
    /** Returns the number of items in the list. */
    size: () => list.length,
    /** Returns the total number of items ever queued. */
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
const isUnarchivedAttribute = (thought: Thought) => isAttribute(thought.value) && thought.value !== '=archive'

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
async function* fetchDescendants(
  provider: DataProvider,
  thoughtIdOrIds: ThoughtId | ThoughtId[],
  getState: () => State,
  {
    cancelRef,
    maxDepth = MAX_DEPTH,
  }: {
    /** A cancel ref that can be set to true to stop any additional descendants from being replicated, leaving their parents pending. Already replicating thoughts will complete as normal. */
    cancelRef?: {
      canceled: boolean
    }
    // Set the depth at which thoughts become pending.
    // If set to Infinity, pulls all available thoughts.
    maxDepth?: number
  } = {},
): AsyncIterable<ThoughtIndices> {
  // use queue for breadth-first loading
  const thoughtIdQueue = queue(typeof thoughtIdOrIds === 'string' ? [thoughtIdOrIds] : thoughtIdOrIds)
  const depth = counter()

  /** A set of pending cursor ids that have already been fetched as part of prioritized cursor fetching (see below). This is needed to prevent an infinite loop if a thought is permanently pending. While this is not supposed to happen, there is a concurrency issue that can cause it. Best to prevent any possibility of an infinite loop here since it is fatal. */
  const cursorPendingIds = new Set<ThoughtId>()

  // thoughtIndex and lexemeIndex that are kept up-to-date with yielded thoughts
  const accumulatedThoughts = { ...getState().thoughts }
  while (thoughtIdQueue.size() > 0) {
    // thoughts may be missing, such as __ROOT__ on first load, or deleted ids
    // filter out the missing thought ids and proceed as usual
    // const providerThoughtsRaw = await provider.getThoughtsByIds(thoughtIdQueue.get())

    // Add the cursor to the queue if the cursor is pending.
    // This ensures that if the cursor is moved while thoughts are still loading, the cursor will always be loaded at the first possible opportunity.
    // This must be done here (within fetchDescendants) instead of in the pull queue to ensure that the cursor is fetched even in the middle of a long pull.
    // Though it results in redundant fetches, this approach is far less complex and far fewer implications than adding pause/resume support or a shared queue.
    // TODO: Avoid redundant cursor fetches
    const cursor = getState().cursor
    const cursorThought = cursor ? (getThoughtById(getState(), head(cursor)) as Thought | null) : null
    const isCursorPending = cursor && (!cursorThought || cursorThought?.pending) && !cursorPendingIds.has(head(cursor))
    if (isCursorPending) {
      cursorPendingIds.add(head(cursor!))
    }

    const ids: ThoughtId[] = [...(isCursorPending ? [head(cursor)] : []), ...thoughtIdQueue.next()]

    // get thoughts from the database
    const providerThoughtsRaw = await provider.getThoughtsByIds(ids)

    const providerThoughtsValidated = providerThoughtsRaw.filter(nonNull)
    const thoughtIdsValidated = ids.filter((value, i) => providerThoughtsRaw[i])
    const pulledThoughtIndex: Index<Thought> = keyValueBy(thoughtIdsValidated, (id, i) => ({
      [id]: providerThoughtsValidated[i],
    }))

    accumulatedThoughts.thoughtIndex = { ...accumulatedThoughts.thoughtIndex, ...pulledThoughtIndex }

    const updatedState: State = {
      ...getState(),
      thoughts: {
        ...getState().thoughts,
        ...accumulatedThoughts,
      },
    }

    const thoughts = providerThoughtsValidated
      .map(thoughtDb => {
        if (thoughtDb.value == null) {
          console.warn('Undefined thought value.', provider.name, thoughtDb)
          return null
        }

        const thought: Thought = thoughtDb
        const childrenIds = Object.values(thought.childrenMap)
        const path = thoughtToPath(updatedState, thoughtDb.id)
        const isEmDescendant = path[0] === EM_TOKEN
        const hasChildren = Object.keys(thought.childrenMap || {}).length > 0
        const isMaxDepthReached = depth.get() >= maxDepth
        // If adding the children would exceed MAX_THOUGHTS_QUEUE, then mark thought as pending.
        // Never mark thoughts as pending if maxDepth is Infinity.
        const isMaxThoughtsReached =
          thoughtIdQueue.total() + childrenIds.length > MAX_THOUGHTS_QUEUED && maxDepth !== Infinity
        const isExpanded = isThoughtExpanded(updatedState, thought.id)
        const parent = getThoughtById(updatedState, thought.parentId)

        // load ancestors of tangential contexts
        if (!parent && thought.parentId !== ROOT_PARENT_ID) {
          thoughtIdQueue.add([thought.parentId])
        }

        const isExpandedOrPinned =
          // we need to check directly for =pin, since it is a sibling and thus not part of accumulatedThoughts yet
          // technically =pin/false is a false positive here, and will cause some thoughts not to be buffered that should, but it is rare
          // we need to determine if this thought should be buffered now, and cannot wait for the =pin child to load
          isExpanded ||
          !!isThoughtExpanded(updatedState, thought.parentId) ||
          !!parent?.childrenMap?.['=pin'] ||
          parent?.value.endsWith(EXPAND_THOUGHT_CHAR)

        // if either the max depth or the max number of thoughts are reached, mark the thought as pending and do not add enqueue children (i.e. buffering)
        // do not buffer leaves, visible thoughts, EM and its descendants, or meta attributes (excluding =archive) and their descendants
        // buffer if max thoughts are reached and the thought is not visible
        const isPending =
          // The only safe way to cancel a pull is to set the thought to pending, otherwise children can appear missing.
          // Leaves and em descendants should never be pending, but expanded or pinned thoughts can be marked pending if the pull is cancelled (since all necessary expanded and meta thoughts for the new cursor will be immediately pulled).
          hasChildren &&
          !isEmDescendant &&
          (cancelRef?.canceled ||
            ((isMaxDepthReached || isMaxThoughtsReached) &&
              !isExpandedOrPinned &&
              !isMetaDescendant(updatedState, thought)))

        // once the buffer limit has been reached, set thoughts with children as pending
        // do not buffer descendants of EM
        // do not buffer descendants of functions (except =archive)
        if (isPending) {
          // enqueue =pin even if the thought is buffered
          // when =pin/true is loaded, then this thought will be marked as expanded and its children can be loaded
          const pinId = thought.childrenMap?.['=pin']
          if (pinId) {
            thoughtIdQueue.add([pinId])
          }
          return {
            ...thought,
            lastUpdated: never(),
            updatedBy: clientId,
            pending: true,
          }
        } else {
          thoughtIdQueue.add(childrenIds)
          return thought
        }
      })
      .filter(nonNull)

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

    depth.inc()
  }
}

export default fetchDescendants
