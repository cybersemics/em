import { equalArrays } from './equalArrays'
import { notNull } from './notNull'
import { timestamp } from './timestamp'
import { Context, Lexeme } from '../types'

/** Returns a new thought plus the given context. Does not add duplicates. */
export const addContext = (thought: Lexeme, context: Context, rank: number, uuid: number): Lexeme => ({
  ...thought,
  ...notNull({
    contexts: (thought.contexts || [])
      .filter((parent: any) =>
        !(equalArrays(parent.context, context) && parent.rank === rank)
      )
      .concat({ context, rank, uuid }),
    created: thought.created,
    lastUpdated: timestamp()
  })
})
