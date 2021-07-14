import { Child } from './Child'
import { Context } from './Context'
import { Index } from './IndexType'
import { Lexeme } from './Lexeme'
import { Parent } from './Parent'
import { Path } from './Path'
import { RecentlyEditedTree } from './RecentlyEditedTree'
import { editThoughtPayload } from '../reducers/editThought'

/** Defines a single batch of updates added to the push queue. */
export interface PushBatch {
  thoughtIndexUpdates: Index<Lexeme | null>
  contextIndexUpdates: Index<Parent | null>
  local?: boolean
  remote?: boolean
  recentlyEdited: RecentlyEditedTree
  pendingDeletes?: { context: Context; child: Child }[]
  pendingEdits?: editThoughtPayload[]
  descendantMoves?: { pathOld: Path; pathNew: Path; pathToPull?: Path }[]
  pendingPulls?: { path: Path }[]
  updates?: Index<string>
  pendingLexemes?: Index<boolean>
}
