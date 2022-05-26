import { HOME_PATH } from '../constants'
import { setCursor } from '../reducers'
import { rootedParentOf, prevSiblingById, getThoughtById } from '../selectors'
import { appendToPath, parentOf, head, unroot, isRoot } from '../util'
import { State } from '../@types'

/** Moves the cursor to the previous sibling. */
const cursorUp = (state: State) => {
  const { cursor } = state
  const path = cursor || HOME_PATH
  const pathParent = rootedParentOf(state, path)

  const cursorThought = getThoughtById(state, head(path))

  if (!cursorThought) {
    console.error('Cursor thought not found!')
    return state
  }

  const { value, rank } = cursorThought

  const thoughtBefore = prevSiblingById(state, value, pathParent, rank)
  const pathBefore = thoughtBefore && unroot(appendToPath(parentOf(path), thoughtBefore.id))
  // const prevNieces = thoughtBefore && getChildrenRanked(pathBefore)
  // const prevNiece = prevNieces && prevNieces[prevNieces.length - 1]

  // TODO: Select deepest previous sibling's descendant (not just previous niece)

  const prevPath =
    // select prev sibling
    thoughtBefore
      ? pathBefore
      : // select parent
      !isRoot(pathParent)
      ? pathParent
      : // previous niece
        // prevNiece ? unroot(pathBefore.concat(prevNiece))
        null // see TODO

  return prevPath ? setCursor(state, { path: prevPath }) : state
}

export default cursorUp
