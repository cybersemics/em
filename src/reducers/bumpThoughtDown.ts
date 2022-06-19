/* eslint-disable */
import _ from 'lodash'
import editThought from '../reducers/editThought'
import moveThought from '../reducers/moveThought'
import createThought from '../reducers/createThought'
import setCursor from '../reducers/setCursor'
import subCategorizeOne from '../reducers/subCategorizeOne'
import editableRender from '../reducers/editableRender'
import getPrevRank from '../selectors/getPrevRank'
import getRankBefore from '../selectors/getRankBefore'
import { getAllChildren } from '../selectors/getChildren'
import simplifyPath from '../selectors/simplifyPath'
import rootedParentOf from '../selectors/rootedParentOf'
import getThoughtById from '../selectors/getThoughtById'
import appendToPath from '../util/appendToPath'
import parentOf from '../util/parentOf'
import headValue from '../util/headValue'
import pathToContext from '../util/pathToContext'
import reducerFlow from '../util/reducerFlow'
import headId from '../util/headId'
import head from '../util/head'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'

/** Clears a thought's text, moving it to its first child. */
const bumpThoughtDown = (state: State, { simplePath }: { simplePath?: SimplePath }): State => {
  if (!simplePath && !state.cursor) return state

  simplePath = simplePath || simplifyPath(state, state.cursor!)

  const headThought = getThoughtById(state, head(simplePath))
  const { value } = headThought

  // const rank = headRank(simplePath)
  const context = pathToContext(state, simplePath)
  const children = getAllChildren(state, head(simplePath))

  // if there are no children
  if (children.length === 0) return subCategorizeOne(state)

  // TODO: Resolve simplePath to make it work within the context view
  // Cannot do this without the contextChain
  // Need to store the full simplePath of each simplePath segment in the simplePath
  const parentPath = parentOf(simplePath)

  // modify the rank to get the thought to re-render (via the Subthoughts child key)
  // this should be fixed
  const simplePathWithNewRank: SimplePath = appendToPath(parentPath, headId(simplePath))
  const simplePathWithNewRankAndValue: Path = appendToPath(parentPath, headId(simplePathWithNewRank))

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
      context: rootedParentOf(state, context),
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

export default _.curryRight(bumpThoughtDown)
