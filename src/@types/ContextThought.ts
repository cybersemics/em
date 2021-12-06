import { Brand } from './Brand'
import { Parent } from './Parent'

/** A parent that represents one of a context that the given thought is in. */
export type ContextThought = Parent & Brand<'ContextThought'>
