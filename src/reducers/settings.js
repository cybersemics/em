// constants
import {
  EM_TOKEN
} from '../constants'

// util
import {
  isFunction,
  rankThoughtsFirstMatch,
} from '../util'

// reducers
import existingThoughtChange from './existingThoughtChange'

// selectors
import getThoughtsRanked from '../selectors/getThoughtsRanked'

// SIDE EFFECTS: localStorage, syncRemote
export default (state, { key, value, local, remote }) => {

  const newValue = value.toString()
  const context = [EM_TOKEN, 'Settings'].concat(key)

  const oldThoughtRanked = getThoughtsRanked(state, context)
    .find(child => !isFunction(child.value))

  if (!oldThoughtRanked) {
    console.warn('Missing oldThoughtRanked in Settings update:', key, value)
    return {}
  }

  return existingThoughtChange(state, {
    context,
    oldValue: oldThoughtRanked.value,
    newValue,
    thoughtsRanked: rankThoughtsFirstMatch(context, { state }).concat({
      value: newValue,
      rank: oldThoughtRanked.rank,
    }),
    local,
    remote,
  })
}
