import Block from '../@types/Block'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Timestamp from '../@types/Timestamp'
import { EM_TOKEN, HOME_TOKEN } from '../constants'
import { clientId } from '../data-providers/thoughtspaceSession'
import { anyChild, getChildrenRanked } from '../selectors/getChildren'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from './appendToPath'
import createId from './createId'
import head from './head'
import isAttribute from './isAttribute'
import timestamp from './timestamp'

export interface ImportJSONOptions {
  lastUpdated?: Timestamp
  skipRoot?: boolean
  updatedBy?: string
}

/** Converts imported blocks into one document batch; TreeCRDT derives child maps and lexemes. */
const importJson = (
  state: State,
  simplePath: SimplePath,
  blocks: Block[],
  { lastUpdated = timestamp(), updatedBy = clientId, skipRoot = false }: ImportJSONOptions = {},
) => {
  const destination = pathToThought(state, simplePath)
  const replaceEmpty = destination?.value === '' && !anyChild(state, head(simplePath))
  const importPath = replaceEmpty ? rootedParentOf(state, simplePath) : simplePath
  const parentId = head(importPath)
  const parent = state.thoughts.thoughtIndex[parentId]
  const normalized = skipRoot && blocks.length ? [...blocks[0].children, ...blocks.slice(1)] : blocks
  const thoughtIndexUpdates: Index<Thought | null> = replaceEmpty ? { [destination.id]: null } : {}
  const movePlacements: Index<ThoughtId | null> = {}
  const siblings = getChildrenRanked(state, parentId)
  const preceding = replaceEmpty
    ? siblings.slice(
        0,
        siblings.findIndex(thought => thought.id === destination.id),
      )
    : siblings

  /** Flattens a block subtree into explicit inserts, preserving the source sibling order. */
  const insertBlocks = (parent: Thought, children: Block[], afterId: ThoughtId | null): ThoughtId | null => {
    for (const block of children) {
      if (block.scope === HOME_TOKEN || block.scope === EM_TOKEN) {
        afterId = insertBlocks(parent, block.children, afterId)
        continue
      }
      const inheritedUpdated = block.lastUpdated || block.children[0]?.lastUpdated || parent.lastUpdated || lastUpdated
      const thought: Thought = {
        id: createId(),
        value: block.scope.trim(),
        parentId: parent.id,
        rank: 0,
        childrenMap: {},
        created: block.created || block.children[0]?.created || lastUpdated,
        lastUpdated: inheritedUpdated,
        updatedBy,
      }
      thoughtIndexUpdates[parent.id] = { ...parent, lastUpdated: inheritedUpdated, updatedBy }
      thoughtIndexUpdates[thought.id] = thought
      movePlacements[thought.id] = afterId
      insertBlocks(thought, block.children, null)
      afterId = thought.id
    }
    return afterId
  }

  const previousId = preceding.at(-1)?.id ?? null
  const lastId = parent ? insertBlocks(parent, normalized, previousId) : null
  // Pasting only attributes should not move the cursor, unless its empty destination was removed.
  const metaOnly = !replaceEmpty && normalized.every(block => isAttribute(block.scope))
  const lastImported = lastId && lastId !== previousId && !metaOnly ? appendToPath(importPath, lastId) : null
  return { thoughtIndexUpdates, movePlacements, lastImported }
}

export default importJson
