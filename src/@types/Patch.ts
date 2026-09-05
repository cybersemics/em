import { Operation } from 'fast-json-patch'
import ActionType from './ActionType'
import CommandId from './CommandId'
import CommandType from './CommandType'

/** Metadata for a patch created by a user command. */
export interface CommandPatchMetadata {
  source: 'command'
  commandId: CommandId
  /** User-facing command label at the time the patch was created. */
  label: string
  type: CommandType
  keyboardIndex?: number
  /** True when every action captured by the command only navigates state. */
  isNavigation: boolean
}

/** Metadata for a patch created outside the command system, such as typing, paste, drag-and-drop, or replication. */
export interface ActionPatchMetadata {
  source: 'action'
  actionType: ActionType
  /** Optional user-facing label for a grouped non-command interaction. */
  label?: string
  /** True when every action captured by the patch only navigates state. */
  isNavigation: boolean
}

export type PatchMetadata = CommandPatchMetadata | ActionPatchMetadata
export type PatchMetadataInput = Omit<CommandPatchMetadata, 'isNavigation'> | Omit<ActionPatchMetadata, 'isNavigation'>

/** An exact state diff and the user-level source that produced it. */
interface Patch {
  ops: Operation[]
  metadata: PatchMetadata
}

export default Patch
