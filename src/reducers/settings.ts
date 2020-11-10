import _ from 'lodash'
import { EM_TOKEN } from '../constants'
import { isFunction } from '../util'
import { existingThoughtChange } from '../reducers'
import { getChildrenRanked, rankThoughtsFirstMatch } from '../selectors'
import { State } from '../util/initialState'
import { SimplePath } from '../types'

/** Sets a setting thought. */
const settings = (state: State, { key, value }: { key: string, value: string }) => {

  const newValue = value.toString()
  const context = [EM_TOKEN, 'Settings', key]

  const oldThoughtRanked = getChildrenRanked(state, context)
    .find(child => !isFunction(child.value))

  if (!oldThoughtRanked) {
    console.warn('Missing oldThoughtRanked in Settings update:', key, value)
    return state
  }

  const simplePath = [
    ...rankThoughtsFirstMatch(state, context),
    {
      ...oldThoughtRanked,
      value: newValue,
    }
  ] as SimplePath

  return existingThoughtChange(state, {
    context,
    oldValue: oldThoughtRanked.value,
    newValue,
    path: simplePath,
  })
}

export default _.curryRight(settings)
