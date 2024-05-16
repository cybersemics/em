import _ from 'lodash'
import Block from '../@types/Block'
import Lexeme from '../@types/Lexeme'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import Timestamp from '../@types/Timestamp'
import { deleteThought } from '../actions'
import { EM_TOKEN, HOME_TOKEN } from '../constants'
import { clientId } from '../data-providers/yjs'
import { anyChild } from '../selectors/getChildren'
import getLexeme from '../selectors/getLexeme'
import getNextRank from '../selectors/getNextRank'
import getThoughtById from '../selectors/getThoughtById'
import nextSibling from '../selectors/nextSibling'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import hashThought from '../util/hashThought'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import timestamp from '../util/timestamp'
import createId from './createId'
import isRoot from './isRoot'
import mergeThoughts from './mergeThoughts'
import mergeUpdates from './mergeUpdates'

export interface ImportJSONOptions {
  lastUpdated?: Timestamp
  skipRoot?: boolean
  updatedBy?: string
}

/** Replace head block with its children, or drop it, if head has no children. */
const skipRootThought = (blocks: Block[]) => {
  const head = _.head(blocks)
  if (!head) return blocks
  const tail = _.tail(blocks)
  return head.children.length > 0 ? [...head.children, ...tail] : tail
}

// MIGRATION_TODO: This function now also returns another thought so that for each Child entry a Thought entry is also created.
/** Generates a Thought and Lexeme for inserting a new thought into a context. */
const insertThought = (
  state: State,
  {
    block,
    id,
    lastUpdated,
    rank,
    updatedBy = clientId,
    value,
  }: {
    block: Block
    id: ThoughtId
    value: string
    rank: number
    lastUpdated?: Timestamp
    updatedBy: string
  },
) => {
  const thoughtOld = getThoughtById(state, id)
  const childLastUpdated = block.children[0]?.lastUpdated
  const childCreated = block.children[0]?.created
  const lastUpdatedInherited =
    block.lastUpdated || childLastUpdated || thoughtOld.lastUpdated || lastUpdated || timestamp()
  const createdInherited = block.created || childCreated || lastUpdated || timestamp()
  const lexemeOld = getLexeme(state, value)

  const newThoughtId = createId()

  const lexemeNew: Lexeme = {
    ...lexemeOld,
    contexts: [...(lexemeOld?.contexts || []), newThoughtId],
    created: lexemeOld?.created ?? createdInherited,
    lastUpdated: lastUpdatedInherited,
    updatedBy,
  }

  const thoughtNew: Thought = {
    ...thoughtOld,
    childrenMap: { ...thoughtOld.childrenMap, [isAttribute(value) ? value : newThoughtId]: newThoughtId },
    lastUpdated: lastUpdatedInherited,
    updatedBy,
  }

  const newThought: Thought = {
    childrenMap: {},
    created: createdInherited,
    id: newThoughtId,
    lastUpdated: lastUpdatedInherited,
    parentId: thoughtOld.id,
    rank,
    updatedBy,
    value,
  }

  return {
    idNew: newThought.id,
    lexemeIndex: {
      [hashThought(value)]: lexemeNew,
    },
    thoughtIndex: {
      [id]: thoughtNew,
      [newThought.id]: newThought,
    },
  }
}

/** Recursively iterate through blocks and generate thought updates to insert each block. */
const saveThoughts = (
  state: State,
  path: Path,
  blocks: Block[],
  rankIncrement = 1,
  startRank = 0,
  lastUpdated = timestamp(),
  updatedBy = clientId,
): ThoughtIndices => {
  const id = head(path)

  if (!id)
    return {
      lexemeIndex: {},
      thoughtIndex: {},
    }

  const updates = blocks.reduce<ThoughtIndices>(
    (accum, block, index) => {
      const skipLevel: boolean = block.scope === HOME_TOKEN || block.scope === EM_TOKEN
      const rank = startRank + index * rankIncrement

      const value = block.scope.trim()

      const stateNewBeforeInsert: State = {
        ...state,
        thoughts: mergeThoughts(state.thoughts, accum),
      }

      const insertUpdates = !skipLevel
        ? insertThought(stateNewBeforeInsert, {
            block,
            id,
            value,
            rank,
            lastUpdated,
            updatedBy,
          })
        : null

      const updatedState = insertUpdates
        ? {
            ...stateNewBeforeInsert,
            thoughts: {
              ...stateNewBeforeInsert.thoughts,
              thoughtIndex: mergeUpdates(stateNewBeforeInsert.thoughts.thoughtIndex, insertUpdates.thoughtIndex),
              lexemeIndex: mergeUpdates(stateNewBeforeInsert.thoughts.lexemeIndex, insertUpdates.lexemeIndex),
            },
          }
        : stateNewBeforeInsert

      const childPath: Path = skipLevel ? path : [...path, insertUpdates!.idNew]

      const updatedAccumulatedThoughtIndex = {
        ...accum.thoughtIndex,
        ...(insertUpdates?.thoughtIndex || {}),
      }

      const updatedAccumulatedLexemeIndex = {
        ...accum.lexemeIndex,
        ...(insertUpdates?.lexemeIndex || {}),
      }

      if (block.children.length > 0) {
        const updates = saveThoughts(updatedState, childPath, block.children, rankIncrement, startRank, lastUpdated)

        return {
          lexemeIndex: {
            ...updatedAccumulatedLexemeIndex,
            ...updates.lexemeIndex,
          },
          thoughtIndex: {
            ...updatedAccumulatedThoughtIndex,
            ...updates.thoughtIndex,
          },
        }
      } else {
        return {
          ...accum,
          lexemeIndex: updatedAccumulatedLexemeIndex,
          thoughtIndex: updatedAccumulatedThoughtIndex,
        }
      }
    },
    {
      thoughtIndex: {},
      lexemeIndex: {},
    },
  )

  return {
    thoughtIndex: updates.thoughtIndex,
    lexemeIndex: updates.lexemeIndex,
  }
}

/** Return number of contexts in blocks array. */
const getContextsNum = (blocks: Block[]): number => {
  return (
    blocks
      // TODO: block.children can be undefined because there are some empty arrays that can slip in instead of Block.
      // Unfortunately removing them causes other tests to fail, so fixing this is a more significant effort.
      .map(block => (!block.children ? 0 : block.children.length > 0 ? 1 + getContextsNum(block.children) : 1))
      .reduce((acc, val) => acc + val, 0)
  )
}

/** Calculate rankIncrement value based on rank of next sibling or its absence. */
const getRankIncrement = (state: State, blocks: Block[], destThought: Thought, rankStart: number) => {
  const next = nextSibling(state, destThought.id) // paste after last child of current thought
  const rankIncrement = next ? (next.rank - rankStart) / (getContextsNum(blocks) || 1) : 1 // prevent divide by zero
  return rankIncrement
}

/** Convert JSON blocks to thoughts update. */
const importJSON = (
  state: State,
  simplePath: SimplePath,
  blocks: Block[],
  { lastUpdated = timestamp(), updatedBy = clientId, skipRoot = false }: ImportJSONOptions = {},
) => {
  const destThought = pathToThought(state, simplePath)
  const destEmpty = destThought.value === '' && !anyChild(state, head(simplePath))
  // use getNextRank instead of getRankAfter because if dest is not empty then we need to import thoughts inside it
  const rankStart = destEmpty ? destThought.rank : getNextRank(state, head(simplePath))
  const rankIncrement = getRankIncrement(state, blocks, destThought, rankStart)
  const pathParent = rootedParentOf(state, simplePath)
  const parentId = head(pathParent)

  // remove empty destination thought
  // pull updates out of pushQueue for convenience
  const stateUpdated = destEmpty ? deleteThought(state, { pathParent, thoughtId: destThought.id }) : state
  const deletedEmptyUpdates = destEmpty ? stateUpdated.pushQueue.slice(-1)[0] : null

  const importPath = destEmpty ? rootedParentOf(state, simplePath) : simplePath
  const blocksNormalized = skipRoot ? skipRootThought(blocks) : blocks

  const { thoughtIndex, lexemeIndex } = saveThoughts(
    stateUpdated,
    importPath,
    blocksNormalized,
    rankIncrement,
    rankStart,
    lastUpdated,
    updatedBy,
  )

  // get the last child imported in the first level so the cursor can be set
  const parent = thoughtIndex[parentId]

  // When importing directly into the root, pathParent and importPath will be the same (confusingly).
  // In this case, do not double count the root subthoughts, as they are already counted in blocksNormalized.
  // (Currently this is not possible in the app, but it is possible in the test suite, and the behavior should be consistent.)
  const lastChildIndex =
    (parent && !destEmpty && !isRoot(importPath) ? Object.values(parent.childrenMap).length : 0) +
    blocksNormalized.length -
    1
  const importId = head(importPath)
  const lastChildFirstLevel =
    thoughtIndex[importId] && Object.values(thoughtIndex[importId].childrenMap)[lastChildIndex]

  // If every thought at the first level is a meta attribute, then do not move the cursor to the last imported thought.
  // This allows pasting styles without the cursor changing.
  // If the destination is empty though, we must set the cursor, since the prevous cursor will be destroyed on import.
  const metaOnly = !destEmpty && blocksNormalized.every(block => isAttribute(block.scope))

  // there may be no last child even if there are imported blocks, i.e. a lone __ROOT__
  const lastImported = lastChildFirstLevel && !metaOnly ? appendToPath(importPath, lastChildFirstLevel) : null

  return {
    thoughtIndexUpdates: {
      ...deletedEmptyUpdates?.thoughtIndexUpdates,
      ...thoughtIndex,
    },
    lexemeIndexUpdates: {
      ...deletedEmptyUpdates?.lexemeIndexUpdates,
      ...lexemeIndex,
    },
    lastImported,
  }
}

export default importJSON
