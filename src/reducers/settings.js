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
export default (state, { key, value, remote = true }) => {

  // use synchronous localStorage for tutorial settings to prevent render delay
  // if (key === 'scaleSize' || key === 'tutorial' || key === 'tutorialChoice' || key === 'tutorialStep') {
  //   localStorage.setItem('settings-' + key, value)
  // }
  // else {
  //   localForage.setItem('settings-' + key, value).catch(err => {
  //     throw new Error(err)
  //   })
  // }

  const newValue = value.toString()

  const oldThoughtRanked = getThoughtsRanked([EM_TOKEN, 'Settings'].concat(key), state.thoughtIndex, state.contextIndex)
    .find(child => !isFunction(child.value))

  const context = [EM_TOKEN, 'Settings'].concat(key)

  return existingThoughtChange(state, {
    context,
    oldValue: oldThoughtRanked.value,
    newValue,
    thoughtsRanked: rankThoughtsFirstMatch(context, { state }).concat({
      value: newValue,
      rank: oldThoughtRanked.rank
    })
  })
}
