import Command from '../@types/Command'
import Path from '../@types/Path'
import State from '../@types/State'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { cursorForwardActionCreator as cursorForward } from '../actions/cursorForward'
import { removeMulticursorActionCreator as removeMulticursor } from '../actions/removeMulticursor'
import CursorForwardIcon from '../components/icons/CursorForwardIcon'
import { getChildrenSorted } from '../selectors/getChildren'
import getContextsSortedAndRanked from '../selectors/getContextsSortedAndRanked'
import hasMulticursor from '../selectors/hasMulticursor'
import isContextViewActive from '../selectors/isContextViewActive'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import headValue from '../util/headValue'

/** Returns the paths that are displayed one level forward of a path, i.e. its contexts if the context view is active, otherwise its visible children. */
const forwardPaths = (state: State, path: Path): Path[] => {
  const contextViewValue = isContextViewActive(state, path) ? headValue(state, path) : undefined
  return contextViewValue !== undefined
    ? getContextsSortedAndRanked(state, contextViewValue).map(cx => appendToPath(path, cx.parentId))
    : getChildrenSorted(state, head(simplifyPath(state, path))).map(child => appendToPath(path, child.id))
}

const cursorForwardCommand: Command = {
  id: 'cursorForward',
  description: 'Move the cursor down a level.',
  hideAlert: true,
  label: 'Forward',
  multicursor: false,
  gesture: 'l',
  svg: CursorForwardIcon,
  exec: (dispatch, getState) => {
    const state = getState()

    // without a multiselect, move the cursor down a level as usual
    if (!hasMulticursor(state)) {
      dispatch(cursorForward())
      return
    }

    const paths = Object.values(state.multicursors)
    const childPaths = paths.flatMap(path => forwardPaths(state, path))

    // do nothing if none of the selected thoughts have children, just as the cursor does not move forward from a leaf
    if (childPaths.length === 0) return

    const childPathHashes = new Set(childPaths.map(hashPath))

    // Select the children before deselecting their parents so that the multiselect is never momentarily empty, which would close the Command Center (see multicursorAlertMiddleware). A selected thought that is also the child of another selected thought stays selected.
    dispatch([
      ...childPaths.map(path => addMulticursor({ path })),
      ...paths.filter(path => !childPathHashes.has(hashPath(path))).map(path => removeMulticursor({ path })),
    ])
  },
}

export default cursorForwardCommand
