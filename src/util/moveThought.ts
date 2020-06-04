import { equalArrays } from './equalArrays'
import { notNull } from './notNull'
import { timestamp } from './timestamp'
import { Context, Lexeme } from '../types'

/** Returns a new thought that has been moved either between contexts or within a context (i.e. Changed rank). */
export const moveThought = (thought: Lexeme, oldContext: Context, newContext: Context, oldRank: number, newRank: number) => {
  return Object.assign({}, thought, notNull({
    contexts: thought.contexts ? thought.contexts
    // remove old context
      .filter(parent => !(equalArrays(parent.context, oldContext) && parent.rank === oldRank))
    // add new context
      .concat({
        context: newContext,
        rank: newRank
      })
    : [],
    created: thought.created,
    lastUpdated: timestamp()
  }))
}
