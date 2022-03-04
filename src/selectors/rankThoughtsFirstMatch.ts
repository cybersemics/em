import { EM_TOKEN, HOME_TOKEN } from '../constants'
import { appendToPath, isRoot } from '../util'
import { SimplePath, State } from '../@types'
import getRootPath from './getRootPath'
import { getAllChildrenAsThoughtsById } from '../selectors/getChildren'

/** Ranks the thoughts from their rank in their context. */
// if there is a duplicate thought in the same context, takes the first
// NOTE: path is pathToContexted
const rankThoughtsFirstMatch = (state: State, pathUnranked: string[]): SimplePath | null => {
  if (isRoot(pathUnranked)) return getRootPath(state)

  // Also supports ranking thoughts from EM context
  const isEmContext = pathUnranked[0] === EM_TOKEN

  const startingThoughtId = isEmContext ? EM_TOKEN : HOME_TOKEN
  const context = pathUnranked.slice(isEmContext ? 1 : 0)

  try {
    return context.reduce<SimplePath>((acc, value, i) => {
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

export default rankThoughtsFirstMatch
