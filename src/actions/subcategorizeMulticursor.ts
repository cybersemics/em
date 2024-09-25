import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import createThought from '../actions/createThought'
import moveThought from '../actions/moveThought'
import setCursor from '../actions/setCursor'
import { AlertType } from '../constants'
import getRankBefore from '../selectors/getRankBefore'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import equalPath from '../util/equalPath'
import head from '../util/head'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'

/** Inserts a new thought and adds the selected thoughts as subthoughts. */
const subcategorizeMulticursor = (state: State) => {
  const { multicursors } = state

  // If there are no active multicursors, do nothing
  if (Object.keys(multicursors).length === 0) return state

  const multicursorPaths = Object.values(multicursors)

  // Sort the paths deterministically in document order
  multicursorPaths.sort((a, b) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const aRank = getThoughtById(state, a[i]).rank
      const bRank = getThoughtById(state, b[i]).rank
      if (aRank !== bRank) return aRank - bRank
    }
    return a.length - b.length
  })

  const firstPath = multicursorPaths[0]
  const commonParent = parentOf(firstPath)

  // Check if all selected thoughts belong to the same parent
  const allSameParent = multicursorPaths.every(path => equalPath(parentOf(path), commonParent))

  if (!allSameParent) {
    return alert(state, {
      alertType: AlertType.MulticursorError,
      value: 'Cannot subcategorize thoughts from different parents.',
    })
  }

  const newRank = getRankBefore(state, simplifyPath(state, firstPath))
  const newThoughtId = createId()

  return reducerFlow([
    createThought({
      path: rootedParentOf(state, firstPath),
      value: '',
      rank: newRank,
      id: newThoughtId,
    }),
    ...multicursorPaths.reverse().map(path =>
      moveThought({
        oldPath: simplifyPath(state, path),
        newPath: appendToPath(commonParent, newThoughtId, head(path)),
        newRank: getThoughtById(state, head(path)).rank,
      }),
    ),
    setCursor({
      path: appendToPath(commonParent, newThoughtId),
      offset: 0,
      editing: true,
    }),
  ])(state)
}

/** A Thunk that dispatches a 'subcategorizeMulticursor` action. */
export const subcategorizeMulticursorActionCreator = (): Thunk => dispatch =>
  dispatch({ type: 'subcategorizeMulticursor' })

export default _.curryRight(subcategorizeMulticursor)
