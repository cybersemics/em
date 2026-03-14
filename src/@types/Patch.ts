import { GetOperation } from 'fast-json-patch'
import ActionType from './ActionType'

// Extend fast-json-patch Operation type to include actions list
// See fast-json-patch types: https://github.com/Starcounter-Jack/JSON-Patch/blob/89a09e94e0e6500115789e33586a75c8dd1aea13/module/core.d.ts
// TODO: This should allow any Operation, not just GetOperation. But how to extend?
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ExtendedOperation<T = any> extends GetOperation<T> {
  actions: ActionType[]
  /** True if the patch represents a formatting-only edit (the plain text content is unchanged but the HTML markup differs, e.g. bold, italic, text color). Used by undoReducer to avoid erroneously grouping the patch with a preceding newThought and deleting the thought. */
  isFormatting?: boolean
}

type Patch = ExtendedOperation[]

export default Patch
