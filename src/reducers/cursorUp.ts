import { HOME_PATH } from '../constants'
import { setCursor } from '../reducers'
import { rootedParentOf, prevSibling } from '../selectors'
import { appendToPath, parentOf, head, pathToContext, unroot, isRoot } from '../util'
import { State } from '../@types'

/** Moves the cursor to the previous sibling. */
const cursorUp = (state: State) => {
  const { cursor } = state
  const path = cursor || HOME_PATH
  const contextRanked = rootedParentOf(state, path)
  const context = pathToContext(state, contextRanked)

  const cursorThought = state.thoughts.contextIndex[head(path)]

  if (!cursorThought) {
    console.error('Cursor thought not found!')
    return state
  }

  const { value, rank } = cursorThought

  const thoughtBefore = prevSibling(state, value, context, rank)
  const pathBefore = thoughtBefore && unroot(appendToPath(parentOf(path), thoughtBefore.id))
  // const prevNieces = thoughtBefore && getChildrenRanked(pathBefore)
  // const prevNiece = prevNieces && prevNieces[prevNieces.length - 1]

  // TODO: Select deepest previous sibling's descendant (not just previous niece)

  const prevPath =
    // select prev sibling
    thoughtBefore
      ? pathBefore
      : // select parent
      !isRoot(context)
      ? contextRanked
      : // previous niece
        // prevNiece ? unroot(pathBefore.concat(prevNiece))
        null // see TODO

  return prevPath ? setCursor(state, { path: prevPath }) : state
}

export default cursorUp
