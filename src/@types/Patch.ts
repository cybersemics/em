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
  /** User-facing command label at the time the patch was created. */
  label: string
  type: CommandType
  keyboardIndex?: number
}

/** Metadata for a patch created outside the command system, such as typing, paste, drag-and-drop, or replication. */
export interface ActionPatchMetadata {
  source: 'action'
  /** Optional user-facing label for a grouped non-command interaction. */
  label?: string
}

export type PatchMetadataInput = CommandPatchMetadata | ActionPatchMetadata
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
}

export default Patch
