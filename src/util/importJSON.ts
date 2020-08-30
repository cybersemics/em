import _ from 'lodash'
import { Child, Context, Lexeme, ParentEntry, Path } from '../types'
import { State } from './initialState'
import { EM_TOKEN, ROOT_TOKEN } from '../constants'
import { getRankAfter, getThought, getThoughts, nextSibling } from '../selectors'

// util
import {
  addThought,
  contextOf,
  createId,
  equalPath,
  equalThoughtRanked,
  hashContext,
  hashThought,
  head,
  headRank,
  pathToContext,
  removeContext,
  rootedContextOf,
  timestamp,
} from '../util'
import { Block } from '../action-creators/importText'
import { GenericObject } from '../utilTypes'

interface ImportHtmlOptions {
  skipRoot? : boolean,
}

interface RankInfo {
  rank: number,
  deepLevel: number,
}

/** Replace head block with its children, or drop it, if head has no children. */
const skipRootThought = (blocks: Block[]) => {
  const head = _.head(blocks)
  if (!head) return blocks
  const tail = _.tail(blocks)
  return head.children.length > 0 ? [...head.children, ...tail] : tail
}

/** Calculate last thought of the first level, as this is where the selection will be restored to. */
const calculateLastThoughtFirstLevel = (rankMap: Map<Block, RankInfo>, blocks: Block[]) => {
  const lastThoughtFirstLevelIndex = blocks.length - 1
  const lastThoughtFirstLevel = blocks[lastThoughtFirstLevelIndex]
  const { rank } = rankMap.get(lastThoughtFirstLevel)!
  return { value: lastThoughtFirstLevel.scope, rank }
}

/** Return map of thought ranks. */
const createRankMap = (blocks: Block[], rankStart: number, rankIncrement: number) => {
  /** Recursively return last child in tree with maximum depth. Return undefined if block has no children. */
  const getLastChildDeep = (block: Block): Block | undefined => {
    const { children } = block
    const lastChild = _.last(children)
    if (!lastChild) return
    return lastChild.children.length > 0 ? getLastChildDeep(lastChild) : lastChild
  }

  /** Recursively calculate rank for each thought. */
  const calculateRanks = (blocks: Block[], rankMap: Map<Block, RankInfo>, rankStart: number, deepLevel = 0) => {
    blocks.forEach((block, index, blocks) => {
      if (index === 0) {
        rankMap.set(block, {
          rank: rankStart,
          deepLevel
        })
        calculateRanks(block.children, rankMap, rankStart + 1 * rankIncrement, deepLevel + 1)
        return
      }
      const prevSibling = blocks[index - 1]
      const prevRankedBlock = getLastChildDeep(prevSibling)
      if (!prevRankedBlock) {
        const prevSiblingRankInfo = rankMap.get(prevSibling)!
        rankMap.set(block, {
          rank: prevSiblingRankInfo.rank + 1 * rankIncrement,
          deepLevel
        })
        calculateRanks(block.children, rankMap, prevSiblingRankInfo.rank + 2 * rankIncrement, deepLevel + 1)
        return
      }
      const prevRankInfo = rankMap.get(prevRankedBlock)!
      rankMap.set(block, {
        rank: prevRankInfo.rank + (1 + prevRankInfo.deepLevel) * rankIncrement,
        deepLevel
      })
      calculateRanks(block.children, rankMap, prevRankInfo.rank + (2 + prevRankInfo.deepLevel) * rankIncrement, deepLevel + 1)
    })
  }

  const rankMap = new Map<Block, RankInfo>()
  calculateRanks(blocks, rankMap, rankStart)
  return rankMap
}

/** Recursively iterate through blocks and call insertThought for each block individually to save it. */
const saveThoughts = (context: Context, rankMap: Map<Block, RankInfo>, blocks: Block[], insertThought: (value: string, context: Context, rank: number) => void) => {
  blocks.forEach(block => {
    const { rank } = rankMap.get(block)!
    insertThought(block.scope, context, rank)
    if (block.children.length > 0) {
      saveThoughts([...context, block.scope], rankMap, block.children, insertThought)
    }
  })
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

/** Return start context for saving thoughts. */
const getStartContext = (thoughtsRanked: Path) => {
  const importCursor = equalPath(thoughtsRanked, [{ value: EM_TOKEN, rank: 0 }])
    ? thoughtsRanked
    : contextOf(thoughtsRanked)
  return pathToContext(importCursor)
}

/** Convert JSON blocks to thoughts update. */
export const importJSON = (state: State, thoughtsRanked: Path, blocks: Block[], { skipRoot = false }: ImportHtmlOptions) => {
  const thoughtIndexUpdates: GenericObject<Lexeme> = {}
  const contextIndexUpdates: GenericObject<ParentEntry> = {}
  const context = pathToContext(contextOf(thoughtsRanked))
  const destThought = head(thoughtsRanked)
  const destEmpty = destThought.value === '' && getThoughts(state, pathToContext(thoughtsRanked)).length === 0
  const thoughtIndex = { ...state.thoughts.thoughtIndex }
  const rankStart = getRankAfter(state, thoughtsRanked)
  const rankIncrement = getRankIncrement(state, blocks, context, destThought, rankStart)

  // if the thought where we are pasting is empty, replace it instead of adding to it
  if (destEmpty) {
    const thought = getThought(state, '')
    if (thought && thought.contexts && thought.contexts.length > 1) {
      thoughtIndexUpdates[hashThought('')] = removeContext(thought, context, headRank(thoughtsRanked))
      const rootedContext = pathToContext(rootedContextOf(thoughtsRanked))
      const contextEncoded = hashContext(rootedContext)
      contextIndexUpdates[contextEncoded] = {
        ...contextIndexUpdates[contextEncoded],
        children: getThoughts(state, rootedContext)
          .filter(child => !equalThoughtRanked(child, destThought)),
        lastUpdated: timestamp(),
      }
    }
  }

  /** Insert the given value at the context. Modifies contextIndex and thoughtIndex. */
  const insertThought = (value: string, context: Context, rank: number) => {
    value = value.trim()
    const id = createId()
    const rootContext = context.length > 0 ? context : [ROOT_TOKEN]
    const thoughtNew = addThought(
      {
        thoughts: {
          thoughtIndex
        }
      },
      value,
      rank,
      id,
      rootContext
    )

    const hash = hashThought(value)
    thoughtIndex[hash] = thoughtNew
    thoughtIndexUpdates[hash] = thoughtNew

    // update contextIndexUpdates
    const contextEncoded = hashContext(rootContext)
    const childrenUpdates = contextIndexUpdates[contextEncoded] ? contextIndexUpdates[contextEncoded].children : []
    contextIndexUpdates[contextEncoded] = {
      ...contextIndexUpdates[contextEncoded],
      children: [...childrenUpdates, {
        value,
        rank,
        id,
        lastUpdated: timestamp(),
      }],
      lastUpdated: timestamp(),
    }
  }

  const startContext = getStartContext(thoughtsRanked)
  const thoughts = skipRoot ? skipRootThought(blocks) : blocks
  const rankMap = createRankMap(thoughts, rankStart, rankIncrement)
  const lastThoughtFirstLevel = calculateLastThoughtFirstLevel(rankMap, thoughts)
  saveThoughts(startContext, rankMap, thoughts, insertThought)
  return {
    contextIndexUpdates,
    lastThoughtFirstLevel,
    thoughtIndexUpdates,
  }
}
