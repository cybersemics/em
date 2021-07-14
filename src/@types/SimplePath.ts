import { Brand } from './Brand'
import { Child } from './Child'

/** A contiguous Path with no cycles. */
export type SimplePath = Child[] & Brand<'SimplePath'>
