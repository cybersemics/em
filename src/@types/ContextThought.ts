import { Brand } from './Brand'
import { Thought } from './Thought'

/** A parent that represents one of a context that the given thought is in. */
export type ContextThought = Thought & Brand<'ContextThought'>
