import _ from 'lodash'
import { EM_TOKEN, HOME_TOKEN } from '../constants'
import { getNextRank, getLexeme, getAllChildren, nextSibling, rootedParentOf, childIdsToThoughts } from '../selectors'
import {
  Block,
  Context,
  Index,
  Lexeme,
  Path,
  SimplePath,
  State,
  Timestamp,
  ThoughtIndices,
  Thought,
  ThoughtId,
} from '../@types'
import { appendToPath, hashThought, head, pathToContext, removeContext, timestamp, headId, unroot } from '../util'
import { createId } from './createId'
import { getSessionId } from './sessionManager'
import { mergeThoughts } from './mergeThoughts'
import { mergeUpdates } from './mergeUpdates'

export interface ImportJSONOptions {
  lastUpdated?: Timestamp
  skipRoot?: boolean
  updatedBy?: string
}

interface ThoughtPair {
  lexeme: Lexeme
  thought: Thought
  newThought: Thought
}

type SaveThoughtsUpdate = ThoughtIndices & {
  // duplicate index keeps track of number of times a value has appeared in the context
  duplicateIndex: Index<number>
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
  thoughtOld: Thought,
  value: string,
  context: Context,
  rank: number,
  created: Timestamp = timestamp(),
  lastUpdated: Timestamp = timestamp(),
  updatedBy = getSessionId(),
): ThoughtPair => {
  const rootContext = context.length > 0 ? context : [HOME_TOKEN]

  const lexemeOld = getLexeme(state, value)

  const newThoughtId = createId()

  const lexemeNew = {
    ...lexemeOld,
    value,
    contexts: [...(lexemeOld?.contexts || []), newThoughtId],
    created: lexemeOld?.created ?? created,
    lastUpdated,
    updatedBy,
  }

  const thoughtNew: Thought = {
    // TODO: merging thoughtOld results in pending: true when importing into initialState. Is that correct?
    ...thoughtOld,
    value: head(rootContext),
    parentId: thoughtOld.parentId,
    children: [...thoughtOld.children, newThoughtId],
    lastUpdated,
    updatedBy,
  }

  const newThought: Thought = {
    id: newThoughtId,
    value: value,
    children: [],
    parentId: thoughtOld.id,
    lastUpdated,
    updatedBy,
    rank,
  }

  return {
    lexeme: lexemeNew,
    thought: thoughtNew,
    newThought,
  }
}

/** Recursively iterate through blocks and call insertThought for each block individually to save it. */
const saveThoughts = (
  state: State,
  path: Path,
  blocks: Block[],
  rankIncrement = 1,
  startRank = 0,
  lastUpdated = timestamp(),
  updatedBy = getSessionId(),
): ThoughtIndices => {
  const contextEncoded = head(path)

  if (!contextEncoded)
    return {
      lexemeIndex: {},
      thoughtIndex: {},
    }

  const updates = blocks.reduce<SaveThoughtsUpdate>(
    (accum, block, index) => {
      const skipLevel = block.scope === HOME_TOKEN || block.scope === EM_TOKEN
      const rank = startRank + index * rankIncrement

      const value = block.scope.trim()
      const hashedValue = hashThought(value)
      const duplicateValueCount = accum.duplicateIndex[hashedValue]

      const nonDuplicateValue =
        duplicateValueCount && duplicateValueCount > 0 ? `${value}(${duplicateValueCount})` : value

      const stateNewBeforeInsert: State = {
        ...state,
        thoughts: mergeThoughts(state.thoughts, accum),
      }

      /**
       * Insert thought and return thought indices updates.
       */
      const insert = () => {
        const existingParent = stateNewBeforeInsert.thoughts.thoughtIndex[contextEncoded]

        const childLastUpdated = block.children[0]?.lastUpdated
        const childCreated = block.children[0]?.created
        const lastUpdatedInherited = block.lastUpdated || childLastUpdated || existingParent.lastUpdated || lastUpdated
        const createdInherited = block.created || childCreated || lastUpdated

        const { lexeme, thought, newThought } = insertThought(
          stateNewBeforeInsert,
          existingParent,
          nonDuplicateValue,
          unroot(pathToContext(state, path)),
          rank,
          createdInherited,
          lastUpdatedInherited,
          updatedBy,
        )

        return {
          lexemeIndex: {
            [hashThought(nonDuplicateValue)]: lexeme,
          },
          thoughtIndex: {
            [contextEncoded]: thought,
            [newThought.id]: newThought,
          },
        }
      }

      const insertUpdates = !skipLevel ? insert() : null

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

      const updatedDuplicateIndex = {
        ...accum.duplicateIndex,
        [hashedValue]: duplicateValueCount ? duplicateValueCount + 1 : 1,
      }

      /**
       * Get the last added child.
       */
      const getLastAddedChild = () => {
        const thought = updatedState.thoughts.thoughtIndex[contextEncoded]
        return childIdsToThoughts(updatedState, thought.children).find(child => child.value === nonDuplicateValue)
      }

      const childPath: Path = skipLevel ? path : [...path, getLastAddedChild()!.id]

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
          duplicateIndex: updatedDuplicateIndex,
        }
      } else {
        return {
          ...accum,
          lexemeIndex: updatedAccumulatedLexemeIndex,
          thoughtIndex: updatedAccumulatedThoughtIndex,
          duplicateIndex: updatedDuplicateIndex,
        }
      }
    },
    {
      thoughtIndex: {},
      lexemeIndex: {},
      duplicateIndex: {},
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
const getRankIncrement = (
  state: State,
  blocks: Block[],
  parentId: ThoughtId,
  destThought: Thought,
  rankStart: number,
) => {
  const destValue = destThought.value
  const destRank = destThought.rank
  const next = parentId ? nextSibling(state, parentId, destValue, destRank) : 0 // paste after last child of current thought
  const rankIncrement = next ? (next.rank - rankStart) / (getContextsNum(blocks) || 1) : 1 // prevent divide by zero
  return rankIncrement
}

/** Convert JSON blocks to thoughts update. */
export const importJSON = (
  state: State,
  simplePath: SimplePath,
  blocks: Block[],
  { lastUpdated = timestamp(), updatedBy = getSessionId(), skipRoot = false }: ImportJSONOptions = {},
) => {
  const initialLexemeIndex: Index<Lexeme> = {}
  const initialThoughtIndex: Index<Thought> = {}
  const parentId = head(rootedParentOf(state, simplePath))
  const destThought = state.thoughts.thoughtIndex[head(simplePath)]
  const destEmpty = destThought.value === '' && getAllChildren(state, head(simplePath)).length === 0
  // use getNextRank instead of getRankAfter because if dest is not empty then we need to import thoughts inside it
  const rankStart = destEmpty ? destThought.rank : getNextRank(state, head(simplePath))
  const rankIncrement = getRankIncrement(state, blocks, parentId, destThought, rankStart)
  const path = rootedParentOf(state, simplePath)
  const id = headId(path)

  // if the thought where we are pasting is empty, replace it instead of adding to it
  if (destEmpty) {
    const lexeme = getLexeme(state, '')
    if (lexeme) {
      initialLexemeIndex[hashThought('')] = removeContext(state, lexeme, destThought.id)
      initialThoughtIndex[id] = {
        ...state.thoughts.thoughtIndex[id],
        children: getAllChildren(state, head(path)).filter(child => child !== destThought.id),
        lastUpdated,
        updatedBy,
      }
    }
  }

  const stateUpdated: State = {
    ...state,
    thoughts: mergeThoughts(state.thoughts, {
      lexemeIndex: initialLexemeIndex,
      thoughtIndex: initialThoughtIndex,
    }),
  }

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
  const thought = initialThoughtIndex[id]
  const lastChildIndex = (thought?.children.length || 0) + blocksNormalized.length - 1
  const importContextEncoded = headId(importPath)
  const lastChildFirstLevel = thoughtIndex[importContextEncoded]?.children[lastChildIndex]

  // there may be no last child even if there are imported blocks, i.e. a lone __ROOT__
  const lastImported = lastChildFirstLevel ? appendToPath(importPath, lastChildFirstLevel) : null

  return {
    thoughtIndexUpdates: { ...initialThoughtIndex, ...thoughtIndex },
    lexemeIndexUpdates: { ...initialLexemeIndex, ...lexemeIndex },
    lastImported,
  }
}
