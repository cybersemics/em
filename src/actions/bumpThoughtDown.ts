/* eslint-disable */
import _ from 'lodash'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import createThought from '../actions/createThought'
import editThought from '../actions/editThought'
import editableRender from '../actions/editableRender'
import moveThought from '../actions/moveThought'
import setCursor from '../actions/setCursor'
import subCategorizeOne from '../actions/subCategorizeOne'
import { getAllChildren } from '../selectors/getChildren'
import getPrevRank from '../selectors/getPrevRank'
import getRankBefore from '../selectors/getRankBefore'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'

/** Clears a thought's text, moving it to its first child. */
const bumpThoughtDown = (state: State, { simplePath }: { simplePath?: SimplePath }): State => {
  if (!simplePath && !state.cursor) return state

  simplePath = simplePath || simplifyPath(state, state.cursor!)

  const headThought = getThoughtById(state, head(simplePath))
  const { value } = headThought

  // const rank = headRank(simplePath)
  const children = getAllChildren(state, head(simplePath))

  // if there are no children
  if (children.length === 0) return subCategorizeOne(state)

  // TODO: Resolve simplePath to make it work within the context view
  // Cannot do this without the contextChain
  // Need to store the full simplePath of each simplePath segment in the simplePath
  const parentPath = parentOf(simplePath)

  // modify the rank to get the thought to re-render (via the Subthoughts child key)
  // this should be fixed
  const simplePathWithNewRank: SimplePath = appendToPath(parentPath, head(simplePath))
  const simplePathWithNewRankAndValue: Path = appendToPath(parentPath, head(simplePathWithNewRank))

  return reducerFlow([
    // modify the rank to get the thought to re-render (via the Subthoughts child key)
    moveThought({
      oldPath: simplePath,
      newPath: simplePathWithNewRank,
      newRank: getRankBefore(state, simplePath),
    }),

    // new thought
    state => {
      // the context of the new empty thought
      return createThought(state, {
        path: simplePath as Path,
        rank: getPrevRank(state, head(simplePath!)),
        value,
      })
    },

    // clear text
    editThought({
      oldValue: value,
      newValue: '',
      path: simplePathWithNewRank,
    }),

    // set cursor
    setCursor({
      path: simplePathWithNewRankAndValue,
      editing: true,
      offset: 0,
    }),
    editableRender,
  ])(state)
}

/** Action-creator for bumpThoughtDown. */
export const bumpThoughtDownActionCreator =
  (payload?: Parameters<typeof bumpThoughtDown>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'bumpThoughtDown', ...payload })

export default _.curryRight(bumpThoughtDown)
