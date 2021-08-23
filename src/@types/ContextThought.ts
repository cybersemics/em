import { Brand } from './Brand'
import { Parent } from './Parent'

export type ContextThought = Parent & Brand<'ContextThought'>
