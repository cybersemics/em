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
import { AlertType } from '../constants'
import documentSort from '../selectors/documentSort'
import findDescendant from '../selectors/findDescendant'
import { getAllChildren } from '../selectors/getChildren'
import getPrevRank from '../selectors/getPrevRank'
import getRankBefore from '../selectors/getRankBefore'
import getSortedRank from '../selectors/getSortedRank'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import equalPath from '../util/equalPath'
import head from '../util/head'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import alert from './alert'
import categorize from './categorize'

/** Clears a thought's text, moving it to its first child. If multiple thoughts are selected, bumps their parent down and moves the selected thoughts into the new thought. */
const bumpThoughtDown = (state: State, { paths, simplePath }: { paths?: Path[]; simplePath?: SimplePath }): State => {
  // the selected thoughts that are moved into the new thought, in document order
  const selection = paths && paths.length > 1 ? documentSort(state, paths) : null

  if (selection && !selection.every(path => equalPath(parentOf(path), parentOf(selection[0])))) {
    return alert(state, {
      alertType: AlertType.MulticursorError,
      value: 'Cannot bump down thoughts from different parents.',
    })
  }

  // The home context has no text to bump down, so simply move the selected thoughts into a new empty thought.
  if (selection && parentOf(selection[0]).length === 0) return categorize(state)

  // Bump the parent of the selected thoughts down, otherwise bump the selected thought or the cursor down.
  const path = simplePath || (selection ? parentOf(selection[0]) : paths?.[0]) || state.cursor

  if (!path) return state

  simplePath = simplePath || simplifyPath(state, path)

  const headThought = getThoughtById(state, head(simplePath))
  if (!headThought) {
    console.warn(`Missing headThought${head(simplePath)}. Aborting bumpThoughtDown.`)
    return state
  }

  const { value } = headThought

  // const rank = headRank(simplePath)
  const children = getAllChildren(state, head(simplePath))

  // if there are no children
  if (children.length === 0) return categorize(state)

  // TODO: Resolve simplePath to make it work within the context view
  // Cannot do this without the contextChain
  // Need to store the full simplePath of each simplePath segment in the simplePath
  const parentPath = parentOf(simplePath)

  // Find the sort preference, if any
  const sortId = findDescendant(state, head(simplePath), ['=sort'])

  // modify the rank to get the thought to re-render (via the Subthoughts child key)
  // this should be fixed
  const simplePathWithNewRank: SimplePath = appendToPath(parentPath, head(simplePath))
  const simplePathWithNewRankAndValue: Path = appendToPath(parentPath, head(simplePathWithNewRank))

  // the id of the new thought that the bumped value is moved to, and that the selected thoughts are moved into
  const newThoughtId = createId()

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
        id: newThoughtId,
        path: simplePath as Path,
        // If there is a sort preference, use it. Otherwise, insert at the top.
        rank: sortId ? getSortedRank(state, head(simplePath), value) : getPrevRank(state, head(simplePath)),
        value,
      })
    },

    // clear text
    editThought({
      oldValue: value,
      newValue: '',
      path: simplePathWithNewRank,
    }),

    // move the selected thoughts into the new thought, preserving their order
    // we ignore selected thoughts that are somehow missing, see getThoughtById
    ...(selection || [])
      .filter(path => getThoughtById(state, head(path)))
      .map(path =>
        moveThought({
          oldPath: simplifyPath(state, path),
          newPath: appendToPath(simplePathWithNewRank, newThoughtId, head(path)),
          newRank: getThoughtById(state, head(path))!.rank,
        }),
      ),

    // set cursor
    setCursor({
      path: simplePathWithNewRankAndValue,
      isKeyboardOpen: true,
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

// Register this action's metadata
registerActionMetadata('bumpThoughtDown', {
  undoable: true,
})
