// constants
import {
  EM_TOKEN,
} from '../constants'

// util
import {
  isFunction,
} from '../util'

// reducers
import existingThoughtChange from './existingThoughtChange'

// selectors
import {
  getThoughtsRanked,
  rankThoughtsFirstMatch,
} from '../selectors'

/** Sets a setting thought. */
export default (state, { key, value }) => {

  const newValue = value.toString()
  const context = [EM_TOKEN, 'Settings'].concat(key)

  const oldThoughtRanked = getThoughtsRanked(state, context)
    .find(child => !isFunction(child.value))

  if (!oldThoughtRanked) {
    console.warn('Missing oldThoughtRanked in Settings update:', key, value)
    return state
  }

  return existingThoughtChange(state, {
    context,
    oldValue: oldThoughtRanked.value,
    newValue,
    thoughtsRanked: rankThoughtsFirstMatch(state, context).concat({
      value: newValue,
      rank: oldThoughtRanked.rank,
      uuid: oldThoughtRanked.uuid,
    }),
  })
}
