import _ from 'lodash'
import { EM_TOKEN } from '../constants'
import appendToPath from '../util/appendToPath'
import isAttribute from '../util/isAttribute'
import editThought from '../reducers/editThought'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getChildrenRanked } from '../selectors/getChildren'
import contextToPath from '../selectors/contextToPath'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'

/** Sets a setting thought. */
const settings = (state: State, { key, value }: { key: string; value: string }) => {
  const newValue = value.toString()
  const context = [EM_TOKEN, 'Settings', key]
  const id = contextToThoughtId(state, context)

  const oldThoughtRanked = id ? getChildrenRanked(state, id).find(child => !isAttribute(child.value)) : null

  if (!oldThoughtRanked) {
    console.warn('Missing oldThoughtRanked in Settings update:', key, value)
    return state
  }

  const simplePath = appendToPath(contextToPath(state, context) as SimplePath, oldThoughtRanked.id)

  return editThought(state, {
    context,
    oldValue: oldThoughtRanked.value,
    newValue,
    path: simplePath,
  })
}

export default _.curryRight(settings)
