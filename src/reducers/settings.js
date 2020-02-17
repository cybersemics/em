// constants
import {
  EM_TOKEN
} from '../constants.js'

// util
import {
  getThoughtsRanked,
  isFunction,
  rankThoughtsFirstMatch,
} from '../util.js'

import existingThoughtChange from './existingThoughtChange'

// SIDE EFFECTS: localStorage, syncRemote
export default (state, { key, value, local, remote }) => {

  const newValue = value.toString()
  const context = [EM_TOKEN, 'Settings'].concat(key)

  const oldThoughtRanked = getThoughtsRanked(context, state.thoughtIndex, state.contextIndex)
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
