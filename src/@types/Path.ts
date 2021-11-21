import { ThoughtId } from './ThoughtId'

/** A sequence of children with ranks. */
export type Path = [ThoughtId, ...ThoughtId[]]
