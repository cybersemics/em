import { equalArrays } from './equalArrays'
import { notNull } from './notNull'
import { timestamp } from './timestamp'
import { Context, Lexeme, ThoughtContext, Timestamp } from '../types'

/** Returns a new thought plus the given context. Does not add duplicates. */
export const addContext = (thought: Lexeme, context: Context, rank: number, id: string, archived: Timestamp): Lexeme => ({
  ...thought,
  ...notNull({
    contexts: (thought.contexts || [])
      .filter((parent: ThoughtContext) =>
        !(equalArrays(parent.context, context) && parent.rank === rank)
      )
      .concat({ context, rank, id, ...archived ? { archived } : {} }),
    created: thought.created || timestamp(),
    lastUpdated: timestamp(),
  })
})
