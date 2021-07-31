import _ from 'lodash'
import { EM_TOKEN, HOME_TOKEN } from '../constants'
import { getNextRank, getLexeme, getAllChildren, nextSibling, rootedParentOf } from '../selectors'
import {
  Block,
  Child,
  Context,
  Index,
  Lexeme,
  Parent,
  SimplePath,
  State,
  Timestamp,
  ThoughtIndices,
  Path,
} from '../@types'
import {
  appendToPath,
  equalThoughtRanked,
  hashThought,
  head,
  headRank,
  parentOf,
  pathToContext,
  removeContext,
  timestamp,
  headId,
  unroot,
} from '../util'
import { createId } from './createId'

export interface ImportJSONOptions {
  lastUpdated?: Timestamp
  skipRoot?: boolean
}

interface ThoughtPair {
  lexeme: Lexeme
  parent: Parent
  newThought: Parent
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

// MIGRATION_TODO: This function now also returns another parent so that for each Child entry a Parent entry is also created.
/** Generates a Parent and Lexeme for inserting a new thought into a context. */
const insertThought = (
  state: State,
  parentOld: Parent,
  value: string,
  context: Context,
  rank: number,
  created: Timestamp = timestamp(),
  lastUpdated: Timestamp = timestamp(),
): ThoughtPair => {
  const rootContext = context.length > 0 ? context : [HOME_TOKEN]

  const lexemeOld = getLexeme(state, value)

  const newThoughtId = createId()

  const lexemeNew = {
    ...lexemeOld,
    value,
    contexts: [
      ...(lexemeOld?.contexts || []),
      {
        id: newThoughtId,
        context: rootContext,
        rank,
      },
    ],
    created: lexemeOld?.created ?? created,
    lastUpdated,
  }

  const parentNew: Parent = {
    // TODO: merging parentOld results in pending: true when importing into initialState. Is that correct?
    id: parentOld.id,
    value: head(rootContext),
    context: rootContext,
    parentId: parentOld.parentId,
    children: [
      ...parentOld.children,
      {
        id: newThoughtId,
        value,
        rank,
        lastUpdated,
      },
    ],
    lastUpdated,
  }

  const newThought: Parent = {
    id: newThoughtId,
    value: value,
    context: [...rootContext, value],
    children: [],
    parentId: parentOld.id,
    lastUpdated,
  }

  return {
    lexeme: lexemeNew,
    parent: parentNew,
    newThought,
  }
}

/** Recursively iterate through blocks and call insertThought for each block individually to save it. */
const saveThoughts = (
  state: State,
  contextIndexUpdates: Index<Parent>,
  thoughtIndexUpdates: Index<Lexeme>,
  path: Path,
  blocks: Block[],
  rankIncrement = 1,
  startRank = 0,
  lastUpdated = timestamp(),
): ThoughtIndices => {
  const contextEncoded = headId(path)

  if (!contextEncoded)
    return {
      thoughtIndex: {},
      contextIndex: {},
    }

  const stateNew: State = {
    ...state,
    thoughts: {
      ...state.thoughts,
      contextIndex: {
        ...state.thoughts.contextIndex,
        ...contextIndexUpdates,
      },
      thoughtIndex: {
        ...state.thoughts.thoughtIndex,
        ...thoughtIndexUpdates,
      },
    },
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

      if (!skipLevel) {
        const accumContextIndex = {
          ...state.thoughts.contextIndex,
          ...contextIndexUpdates,
          ...accum.contextIndex,
        }

        const existingParent = accumContextIndex[contextEncoded]

        const childLastUpdated = block.children[0]?.lastUpdated
        const childCreated = block.children[0]?.created
        const lastUpdatedInherited = block.lastUpdated || childLastUpdated || existingParent.lastUpdated || lastUpdated
        const createdInherited = block.created || childCreated || lastUpdated

        const { lexeme, parent, newThought } = insertThought(
          stateNew,
          existingParent,
          nonDuplicateValue,
          unroot(pathToContext(path)),
          rank,
          createdInherited,
          lastUpdatedInherited,
        )

        // TODO: remove mutations
        contextIndexUpdates[contextEncoded] = parent
        // `Parent` entry for the newly created thought.
        contextIndexUpdates[newThought.id] = newThought
        thoughtIndexUpdates[hashThought(nonDuplicateValue)] = lexeme
      }

      const updatedDuplicateIndex = {
        ...accum.duplicateIndex,
        [hashedValue]: duplicateValueCount ? duplicateValueCount + 1 : 1,
      }

      /**
       *
       */
      const getLastAddedChild = () => {
        const parent = contextIndexUpdates[contextEncoded]
        return parent.children.find(child => child.value === nonDuplicateValue)
      }

      const childPath = skipLevel ? path : [...path, getLastAddedChild()!]

      if (block.children.length > 0) {
        return {
          ...saveThoughts(
            state,
            contextIndexUpdates,
            thoughtIndexUpdates,
            childPath as Path,
            block.children,
            rankIncrement,
            startRank,
            lastUpdated,
          ),
          duplicateIndex: updatedDuplicateIndex,
        }
      } else {
        return {
          ...accum,
          duplicateIndex: updatedDuplicateIndex,
        }
      }
    },
    {
      contextIndex: contextIndexUpdates,
      thoughtIndex: thoughtIndexUpdates,
      duplicateIndex: {},
    },
  )

  return {
    contextIndex: updates.contextIndex,
    thoughtIndex: updates.thoughtIndex,
  }
}

/** Return number of contexts in blocks array. */
const getContextsNum = (blocks: Block[]): number => {
  return blocks
    .map(block => (block.children.length > 0 ? 1 + getContextsNum(block.children) : 1))
    .reduce((acc, val) => acc + val, 0)
}

/** Calculate rankIncrement value based on rank of next sibling or its absence. */
const getRankIncrement = (state: State, blocks: Block[], context: Context, destThought: Child, rankStart: number) => {
  const destValue = destThought.value
  const destRank = destThought.rank
  const next = nextSibling(state, destValue, context, destRank) // paste after last child of current thought
  const rankIncrement = next ? (next.rank - rankStart) / (getContextsNum(blocks) || 1) : 1 // prevent divide by zero
  return rankIncrement
}

/** Convert JSON blocks to thoughts update. */
export const importJSON = (
  state: State,
  simplePath: SimplePath,
  blocks: Block[],
  { lastUpdated = timestamp(), skipRoot = false }: ImportJSONOptions = {},
) => {
  const initialThoughtIndex: Index<Lexeme> = {}
  const initialContextIndex: Index<Parent> = {}
  const context = pathToContext(parentOf(simplePath))
  const destThought = head(simplePath)
  const destEmpty = destThought.value === '' && getAllChildren(state, pathToContext(simplePath)).length === 0
  // use getNextRank instead of getRankAfter because if dest is not empty then we need to import thoughts inside it
  const rankStart = destEmpty ? destThought.rank : getNextRank(state, pathToContext(simplePath))
  const rankIncrement = getRankIncrement(state, blocks, context, destThought, rankStart)
  const rootedPath = rootedParentOf(state, simplePath)
  const rootedContext = pathToContext(rootedPath)
  const contextEncoded = headId(rootedPath)

  // if the thought where we are pasting is empty, replace it instead of adding to it
  if (destEmpty) {
    const lexeme = getLexeme(state, '')
    if (lexeme) {
      initialThoughtIndex[hashThought('')] = removeContext(lexeme, context, headRank(simplePath))
      initialContextIndex[contextEncoded] = {
        ...state.thoughts.contextIndex[contextEncoded],
        context: rootedContext,
        children: getAllChildren(state, rootedContext).filter(child => !equalThoughtRanked(child, destThought)),
        lastUpdated,
      }
    }
  }

  const importPath = destEmpty ? rootedParentOf(state, simplePath) : simplePath
  const blocksNormalized = skipRoot ? skipRootThought(blocks) : blocks

  const { contextIndex, thoughtIndex } = saveThoughts(
    state,
    { ...initialContextIndex },
    { ...initialThoughtIndex },
    importPath,
    blocksNormalized,
    rankIncrement,
    rankStart,
    lastUpdated,
  )

  // get the last child imported in the first level so the cursor can be set
  const parent = initialContextIndex[contextEncoded]
  const lastChildIndex = (parent?.children.length || 0) + blocksNormalized.length - 1
  const importContextEncoded = headId(importPath)
  const lastChildFirstLevel = contextIndex[importContextEncoded]?.children[lastChildIndex]
  const lastImported = appendToPath(importPath, lastChildFirstLevel)

  return {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
    lastImported,
  }
}
