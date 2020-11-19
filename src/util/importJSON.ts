import _ from 'lodash'
import { EM_TOKEN, ID, ROOT_TOKEN } from '../constants'
import { getRankAfter, getThought, getAllChildren, nextSibling } from '../selectors'
import { Block, Child, Context, Index, Lexeme, Parent, SimplePath, Timestamp, ThoughtIndices } from '../types'
import { State } from '../util/initialState'

// util
import {
  createId,
  equalThoughtRanked,
  hashContext,
  hashThought,
  head,
  headRank,
  parentOf,
  pathToContext,
  removeContext,
  rootedParentOf,
  timestamp,
  unroot,
} from '../util'

export interface ImportJSONOptions {
  lastUpdated?: Timestamp,
  skipRoot? : boolean,
}

interface ThoughtPair {
  lexeme: Lexeme,
  parent: Parent,
}

/** Replace head block with its children, or drop it, if head has no children. */
const skipRootThought = (blocks: Block[]) => {
  const head = _.head(blocks)
  if (!head) return blocks
  const tail = _.tail(blocks)
  return head.children.length > 0 ? [...head.children, ...tail] : tail
}

/** Calculate last thought of the first level, as this is where the selection will be restored to. */
const calculateLastThoughtFirstLevel = (rankIncrement: number, rankStart: number, blocks: Block[]): Child => {
  const lastThoughtFirstLevelIndex = blocks.length - 1
  const lastThoughtFirstLevel = blocks[lastThoughtFirstLevelIndex]
  const rank = lastThoughtFirstLevelIndex * rankIncrement + rankStart
  return { value: lastThoughtFirstLevel.scope, rank }
}

/** Generates a Parent and Lexeme for inserting a new thought into a context. */
const insertThought = (state: State, parentOld: Parent, value: string, context: Context, rank: number, created: Timestamp = timestamp(), lastUpdated: Timestamp = timestamp()): ThoughtPair => {
  const rootContext = context.length > 0 ? context : [ROOT_TOKEN]
  const id = createId()

  const lexemeOld = getThought(state, value)
  const lexemeNew = {
    ...lexemeOld,
    value,
    contexts: [...lexemeOld?.contexts || [], {
      id,
      context: rootContext,
      rank,
    }],
    created: lexemeOld?.created ?? created,
    lastUpdated,
  }

  const parentNew: Parent = {
    // TODO: merging parentOld results in pending: true when importing into initialState. Is that correct?
    id: hashContext(rootContext),
    context: rootContext,
    children: [...parentOld.children, {
      id,
      value,
      rank,
      lastUpdated,
    }],
    lastUpdated,
  }

  return {
    lexeme: lexemeNew,
    parent: parentNew,
  }
}

/** Recursively iterate through blocks and call insertThought for each block individually to save it. */
const saveThoughts = (state: State, contextIndexUpdates: Index<Parent>, thoughtIndexUpdates: Index<Lexeme>, context: Context, blocks: Block[], rankIncrement = 1, startRank = 0, lastUpdated = timestamp()): ThoughtIndices => {

  const contextEncoded = hashContext(context)

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
      }
    }
  }

  const updates = blocks.reduce((accum, block, index) => {
    const skipLevel = block.scope === ROOT_TOKEN || block.scope === EM_TOKEN
    const rank = startRank + index * rankIncrement
    if (!skipLevel) {
      const value = block.scope.trim()

      const existingChildren =
        contextIndexUpdates[contextEncoded]?.children ||
        state.thoughts.contextIndex[contextEncoded]?.children || []
      const existingParent = {
        ...accum.contextIndex[contextEncoded] || contextIndexUpdates[contextEncoded] || state.thoughts.contextIndex[contextEncoded],
        children: existingChildren,
      }

      const childLastUpdated = block.children[0]?.lastUpdated
      const childCreated = block.children[0]?.created
      const lastUpdatedInherited = block.lastUpdated ||
        childLastUpdated ||
        existingParent.lastUpdated ||
        lastUpdated
      const createdInherited = block.created ||
        childCreated ||
        lastUpdated
      const { lexeme, parent } = insertThought(stateNew, existingParent, value, context, rank, createdInherited, lastUpdatedInherited)

      // TODO: remove mutations
      contextIndexUpdates[contextEncoded] = parent
      thoughtIndexUpdates[hashThought(value)] = lexeme
    }

    if (block.children.length > 0) {
      const childContext = skipLevel ? context : unroot([...context, block.scope])
      return saveThoughts(state, contextIndexUpdates, thoughtIndexUpdates, childContext, block.children, rankIncrement, startRank, lastUpdated)
    }
    else {
      return accum
    }
  }, {
    contextIndex: contextIndexUpdates,
    thoughtIndex: thoughtIndexUpdates,
  } as ThoughtIndices)

  return updates
}

/** Return number of contexts in blocks array. */
const getContextsNum = (blocks: Block[]): number => {
  return blocks
    .map(thought => thought.children.length > 0
      ? 1 + getContextsNum(thought.children)
      : 1
    )
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
export const importJSON = (state: State, simplePath: SimplePath, blocks: Block[], { lastUpdated = timestamp(), skipRoot = false }: ImportJSONOptions) => {
  const initialThoughtIndex: Index<Lexeme> = {}
  const initialContextIndex: Index<Parent> = {}
  const context = pathToContext(parentOf(simplePath))
  const destThought = head(simplePath)
  const destEmpty = destThought.value === '' && getAllChildren(state, pathToContext(simplePath)).length === 0
  const rankStart = getRankAfter(state, simplePath)
  const rankIncrement = getRankIncrement(state, blocks, context, destThought, rankStart)

  // if the thought where we are pasting is empty, replace it instead of adding to it
  if (destEmpty) {
    const thought = getThought(state, '')
    if (thought) {
      initialThoughtIndex[hashThought('')] = removeContext(thought, context, headRank(simplePath))
      const rootedContext = pathToContext(rootedParentOf(simplePath))
      const contextEncoded = hashContext(rootedContext)
      initialContextIndex[contextEncoded] = {
        id: contextEncoded,
        ...initialContextIndex[contextEncoded],
        context: rootedContext,
        children: getAllChildren(state, rootedContext)
          .filter(child => !equalThoughtRanked(child, destThought)),
        lastUpdated,
      }
    }
  }

  const importPath = (destEmpty ? rootedParentOf : ID)(simplePath)
  const importContext = pathToContext(importPath)
  const blocksNormalized = skipRoot ? skipRootThought(blocks) : blocks
  const lastChildFirstLevel = calculateLastThoughtFirstLevel(rankIncrement, rankStart, blocksNormalized)

  const { contextIndex, thoughtIndex } = saveThoughts(state, initialContextIndex, initialThoughtIndex, importContext, blocksNormalized, rankIncrement, rankStart, lastUpdated)

  return {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
    lastImported: unroot([...importPath, lastChildFirstLevel]),
  }
}
