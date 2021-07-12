import { Context } from './Context'
import { Index } from './IndexType'

/** An environment for evaluating expressions defined by lazily loaded Contexts. */
export type LazyEnv = Index<Context>
