import { equalArrays } from './equalArrays.js'
import { notNull } from './notNull.js'
import { makeCompareByProp } from './makeCompareByProp.js'
import { sort } from './sort.js'

/** Returns a new thought remove duplicated given context. */
export const removeDuplicatedContext = (thought, context) => {
  if (typeof thought === 'string') throw new Error('removeDuplicatedContext expects an [object] thought, not a [string] value.')
  const topRankContext = sort((thought.contexts || []), makeCompareByProp('rank'))
    .find(parent => equalArrays(parent.context, context))
  return Object.assign({}, thought, notNull({
    contexts: (thought.contexts || [])
      .filter(parent =>
        !(equalArrays(parent.context, context) && parent.rank !== topRankContext.rank)
      )
  }))
}
