import _ from 'lodash'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { EM_TOKEN } from '../constants'
import editThought from '../reducers/editThought'
import contextToPath from '../selectors/contextToPath'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getChildrenRanked } from '../selectors/getChildren'
import appendToPath from '../util/appendToPath'
import isAttribute from '../util/isAttribute'

/** Sets a setting thought. */
const settings = (state: State, { key, value }: { key: string; value: string }) => {
  const newValue = value.toString()
  const context = [EM_TOKEN, 'Settings', key]

  // id of the Settings child we are editing
  const id = contextToThoughtId(state, context)

  // get the first non-attribute child
  // assume that settings only have one
  const children = getChildrenRanked(state, id)
  const firstChild = id ? children.find(child => !isAttribute(child.value)) : null

  if (!firstChild) {
    console.warn('Missing Settings value:', key, value)
    console.warn('children', children)
    return state
  }

  const simplePath = appendToPath(contextToPath(state, context) as SimplePath, firstChild.id)

  return editThought(state, {
    oldValue: firstChild.value,
    newValue,
    path: simplePath,
  })
}

export default _.curryRight(settings)
