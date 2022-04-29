import { EM_TOKEN, HOME_TOKEN } from '../constants'
import { appendToPath, isRoot } from '../util'
import { SimplePath, State } from '../@types'
import getRootPath from './getRootPath'
import { getAllChildrenAsThoughtsById } from '../selectors/getChildren'

/** DEPRECATED: Converts a Context to a Path. This is a lossy function! If there is a duplicate thought in the same context, it takes the first. It should be removed. */
const contextToPath = (state: State, context: string[]): SimplePath | null => {
  if (isRoot(context)) return getRootPath(state)

  // Also supports thoughts starting from em context
  const isEmContext = context[0] === EM_TOKEN

  const startingThoughtId = isEmContext ? EM_TOKEN : HOME_TOKEN
  const contextUnrooted = context.slice(isEmContext ? 1 : 0)

  try {
    return contextUnrooted.reduce<SimplePath>((acc, value, i) => {
      const prevParentId = acc[acc.length - 1] || startingThoughtId
      const children = getAllChildrenAsThoughtsById(state, prevParentId)
      const firstChild = children.find(child => child.value === value)

      if (!firstChild) throw Error('Thought not found')

      const isEm = i === 0 && value === EM_TOKEN

      return appendToPath(acc, isEm ? EM_TOKEN : firstChild.id)
    }, [] as any as SimplePath)
  } catch (err) {
    return null
  }
}

export default contextToPath
