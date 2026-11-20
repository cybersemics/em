import { Operation } from 'fast-json-patch'
import ActionType from './ActionType'
import CommandId from './CommandId'
import CommandType from './CommandType'

/** Metadata for a patch created by a user command. */
export interface CommandPatchMetadata {
  source: 'command'
  /** Identifies this execution, including its asynchronous continuations, without implying an undo group. */
  invocationId: string
  commandId: CommandId
  /** User-facing command label at the time the patch was created, or the undoLabel of an action dispatched by the command, which describes what the command did more specifically. */
  label: string
  /** How the command was invoked. Undefined for programmatic execution. */
  type?: CommandType
  keyboardIndex?: number
}

/** Metadata for a patch created outside the command system, such as typing, paste, drag-and-drop, or replication. */
export interface ActionPatchMetadata {
  source: 'action'
  /** Optional user-facing label for a grouped non-command interaction. */
  label?: string
}

export type PatchMetadataInput = CommandPatchMetadata | ActionPatchMetadata

/** Command attribution carried by each action dispatched during a command transaction. */
export interface CommandAttributedAction {
  commandMetadata?: CommandPatchMetadata
}
export type PatchMetadata = PatchMetadataInput & {
  /** The underlying action types, in first-occurrence order, independently of the command that produced them. */
  actionTypes: [ActionType, ...ActionType[]]
  /** True when every recorded action only navigates state. */
  isNavigation: boolean
}

/** An exact state diff and the user-level source that produced it. */
interface Patch {
  ops: Operation[]
  metadata: PatchMetadata
  /** Where the caret was in the cursor thought immediately before and after the patch's actions ran. Undo restores before, and Redo restores after. It is stored rather than diffed, because a caret move that is not an undo step still writes state.cursorOffset, and a diff would hand that move to the next Undo or Redo (#6221). */
  cursorOffset: {
    before: number | null
    after: number | null
  }
}

export default Patch
