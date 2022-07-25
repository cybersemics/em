import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import cursorBack from '../reducers/cursorBack'
import deleteThought from '../reducers/deleteThought'
import setCursor from '../reducers/setCursor'
import { firstVisibleChild } from '../selectors/getChildren'
import getContextsSortedAndRanked from '../selectors/getContextsSortedAndRanked'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import parentOfThought from '../selectors/parentOfThought'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import thoughtToPath from '../selectors/thoughtToPath'
import thoughtsEditingFromChain from '../selectors/thoughtsEditingFromChain'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import headValue from '../util/headValue'
import once from '../util/once'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'
import reducerFlow from '../util/reducerFlow'
import unroot from '../util/unroot'

/** Deletes a thought and moves the cursor to a nearby valid thought. */
const deleteThoughtWithCursor = (state: State, payload: { path?: Path }) => {
  if (!state.cursor && !payload.path) return state

  const path = (payload.path || state.cursor)! // eslint-disable-line fp/no-let

  // same as in newThought
  const showContexts = isContextViewActive(state, rootedParentOf(state, path))
  const simplePath = showContexts ? simplifyPath(state, path) : thoughtToPath(state, head(path))
  const parentId = head(rootedParentOf(state, simplePath))
  const thoughts = pathToContext(state, simplePath)
  const context = rootedParentOf(state, thoughts)

  const thought = getThoughtById(state, head(simplePath))
  const { value, rank } = thought

  /** Calculates the previous context within a context view. */
  // TODO: Refactor into prevThought (cf nextThought)
  const prevContext = () => {
    const thoughtsContextView = thoughtsEditingFromChain(state, simplePath)
    const prevContext = once(() => {
      const contexts = getContextsSortedAndRanked(state, headValue(state, thoughtsContextView))
      const removedThoughtIndex = contexts.findIndex(({ id }) => {
        const parentThought = parentOfThought(state, id)
        return parentThought?.value === value
      })
      return contexts[removedThoughtIndex - 1]
    })
    const context = prevContext()
    return context
  }

  // prev must be calculated before dispatching deleteThought
  const prev = showContexts ? prevContext() : prevSibling(state, value, rootedParentOf(state, simplePath), rank)

  /** Sets the cursor or moves it back if it doesn't exist. */
  const setCursorOrBack = (path: Path | null, { offset }: { offset?: number } = {}) =>
    path
      ? (state: State) =>
          setCursor(state, {
            path: path,
            editing: state.editing,
            offset,
          })
      : cursorBack

  return reducerFlow([
    // delete thought
    deleteThought({
      pathParent: parentOf(simplePath),
      thoughtId: head(simplePath),
    }),

    // move cursor
    state => {
      // TODO: Refactor into nextThought/prevThought
      const next = once(() => (showContexts ? null : firstVisibleChild(state, parentId)))

      // Typescript validates with apply but not spread operator here
      // eslint-disable-next-line prefer-spread
      return setCursorOrBack.apply(
        null,
        prev
          ? [appendToPath(parentOf(path), prev.id), { offset: prev.value.length }]
          : // Case II: set cursor on next thought
          next()
          ? [
              unroot(
                showContexts ? appendToPath(parentOf(path), next()!.id) : appendToPath(parentOf(path), next()!.id),
              ),
              { offset: 0 },
            ]
          : // Case III: delete last thought in context; set cursor on context
          thoughts.length > 1
          ? [rootedParentOf(state, path), { offset: getTextContentFromHTML(head(context)).length }]
          : // Case IV: delete very last thought; remove cursor
            [null],
      )(state)
    },
  ])(state)
}

export default _.curryRight(deleteThoughtWithCursor)
