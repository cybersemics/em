import { GetOperation } from 'fast-json-patch'
import { UnknownAction } from 'redux'
import ActionType from './ActionType'

// Extend fast-json-patch Operation type to include actions list
// See fast-json-patch types: https://github.com/Starcounter-Jack/JSON-Patch/blob/89a09e94e0e6500115789e33586a75c8dd1aea13/module/core.d.ts
// TODO: This should allow any Operation, not just GetOperation. But how to extend?
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ExtendedOperation<T = any> extends GetOperation<T> {
  /** The types of the actions that produced the patch, in dispatch order. For a multicursor command, the first entry is the command's undoLabel rather than an action type. */
  actions: ActionType[]
  /** The actions that produced the patch as they were dispatched, i.e. with their payloads, aligned with actions. They let a patch be described in terms of the thoughts it changed, e.g. in the undo slider's steps to reproduce. */
  rawActions: UnknownAction[]
}

type Patch = ExtendedOperation[]

export default Patch
