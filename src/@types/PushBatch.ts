import { PendingMerge } from '.'
import { Context } from './Context'
import { Index } from './IndexType'
import { Lexeme } from './Lexeme'
import { Thought } from './Thought'
import { Path } from './Path'
import { RecentlyEditedTree } from './RecentlyEditedTree'

/** Defines a single batch of updates added to the push queue. */
export interface PushBatch {
  lexemeIndexUpdates: Index<Lexeme | null>
  thoughtIndexUpdates: Index<Thought | null>
  local?: boolean
  remote?: boolean
  recentlyEdited: RecentlyEditedTree
  pendingDeletes?: { context: Context; thought: Thought }[]
  pendingPulls?: { path: Path }[]
  updates?: Index<string>
  pendingLexemes?: Index<boolean>
  pendingMerges?: PendingMerge[]
}
