import { Brand } from './Brand'
import { Path } from './Path'

/** A contiguous Path with no cycles. */
export type SimplePath = Path & Brand<'SimplePath'>
