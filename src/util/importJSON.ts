import _ from 'lodash'
import Block from '../@types/Block'
import Context from '../@types/Context'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import Timestamp from '../@types/Timestamp'
import { EM_TOKEN, HOME_TOKEN } from '../constants'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import { getAllChildren } from '../selectors/getChildren'
import getLexeme from '../selectors/getLexeme'
import getNextRank from '../selectors/getNextRank'
import nextSibling from '../selectors/nextSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import createChildrenMap from '../util/createChildrenMap'
import hashThought from '../util/hashThought'
import head from '../util/head'
import headId from '../util/headId'
import isAttribute from '../util/isAttribute'
import pathToContext from '../util/pathToContext'
import removeContext from '../util/removeContext'
import timestamp from '../util/timestamp'
import unroot from '../util/unroot'
import createId from './createId'
import mergeThoughts from './mergeThoughts'
import mergeUpdates from './mergeUpdates'
import { getSessionId } from './sessionManager'

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
    childrenMap: { ...thoughtOld.childrenMap, [isAttribute(value) ? value : newThoughtId]: newThoughtId },
    lastUpdated,
    updatedBy,
  }

  const newThought: Thought = {
    id: newThoughtId,
    value,
    childrenMap: {},
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
  const id = head(path)

  if (!id)
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
        const existingParent = stateNewBeforeInsert.thoughts.thoughtIndex[id]

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
            [id]: thought,
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
        const thought = updatedState.thoughts.thoughtIndex[id]
        return childIdsToThoughts(updatedState, Object.values(thought.childrenMap)).find(
          child => child.value === nonDuplicateValue,
        )!.id
      }

      const childPath: Path = skipLevel ? path : [...path, getLastAddedChild()]

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

  // insert the new thoughtIndex into the state just for createChildrenMap
  // otherwise createChildrenMap will not be able to find the new child and thus not properly detect meta attributes which are stored differently
  // const stateWithNewThoughtIndex = {
  //   ...state,
  //   thoughts: {
  //     ...state.thoughts,
  //     thoughtIndex: { ...state.thoughts.thoughtIndex, ...updates.thoughtIndex },
  //   },
  // }

  // set childrenMap on each thought
  // this must be done after all thoughts have been inserted, because siblings are not always present when a thought is created, causing them to be omitted from the childrenMap
  // Object.values(updates.thoughtIndex).forEach(update => {
  //   if (!update) return
  //   update.childrenMap = createChildrenMap(stateWithNewThoughtIndex, Object.values(update.childrenMap))
  // })

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
const importJSON = (
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
      const childrenNew = getAllChildren(state, head(path)).filter(child => child !== destThought.id)
      initialThoughtIndex[id] = {
        ...state.thoughts.thoughtIndex[id],
        childrenMap: createChildrenMap(state, childrenNew),
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
  const lastChildIndex = ((thought && Object.values(thought.childrenMap).length) || 0) + blocksNormalized.length - 1
  const importId = headId(importPath)
  const lastChildFirstLevel =
    thoughtIndex[importId] && Object.values(thoughtIndex[importId].childrenMap)[lastChildIndex]

  // there may be no last child even if there are imported blocks, i.e. a lone __ROOT__
  const lastImported = lastChildFirstLevel ? appendToPath(importPath, lastChildFirstLevel) : null

  return {
    thoughtIndexUpdates: { ...initialThoughtIndex, ...thoughtIndex },
    lexemeIndexUpdates: { ...initialLexemeIndex, ...lexemeIndex },
    lastImported,
  }
}

export default importJSON
