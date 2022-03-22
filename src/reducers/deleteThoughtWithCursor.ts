import _ from 'lodash'
import { cursorBack, deleteThought, setCursor, setNativeCaretSelection } from '../reducers'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import { Path, State } from '../@types'

// util
import { appendToPath, parentOf, head, headValue, pathToContext, once, reducerFlow, unroot } from '../util'

// selectors
import {
  firstVisibleChild,
  getContextsSortedAndRanked,
  isContextViewActive,
  rootedParentOf,
  prevSibling,
  simplifyPath,
  thoughtsEditingFromChain,
  getParentThought,
  getThoughtById,
} from '../selectors'

/** Deletes a thought and moves the cursor to a nearby valid thought. */
const deleteThoughtWithCursor = (state: State, payload: { path?: Path }) => {
  if (!state.cursor && !payload.path) return state

  const path = (payload.path || state.cursor)! // eslint-disable-line fp/no-let

  // same as in newThought
  const showContexts = isContextViewActive(state, pathToContext(state, parentOf(path)))
  // @MIGRATION_TODO: Fix the context view related logic here.
  if (showContexts) {
    // Get thought in ContextView
    // const thoughtInContextView = head(parentOf(path))
    // // Get context from which we are going to delete thought
    // const context = getContexts(state, thoughtInContextView.value)
    //   .map(({ context }) => context)
    //   .find(context => head(context) === headValue(path))
    // if (context) {
    //   // Convert to path
    //   path = rankThoughtsFirstMatch(state, [...context, thoughtInContextView.value])
    // }
  }
  const simplePath = simplifyPath(state, path)
  const thoughts = pathToContext(state, simplePath)
  const context = rootedParentOf(state, thoughts)

  const thought = getThoughtById(state, head(simplePath))
  const { value, rank } = thought

  /** Calculates the previous context within a context view. */
  const prevContext = () => {
    const thoughtsContextView = thoughtsEditingFromChain(state, simplePath)
    const prevContext = once(() => {
      const contexts = getContextsSortedAndRanked(state, headValue(state, thoughtsContextView))
      const removedThoughtIndex = contexts.findIndex(({ id }) => {
        const parentThought = getParentThought(state, id)
        return parentThought?.value === value
      })
      return contexts[removedThoughtIndex - 1]
    })
    const context = prevContext()
    return context
  }

  // prev must be calculated before dispatching deleteThought
  const prev = showContexts ? prevContext() : prevSibling(state, value, context, rank)

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
      context: parentOf(pathToContext(state, simplePath)),
      showContexts,
      thoughtId: head(simplePath),
    }),

    // move cursor
    state => {
      const next = once(() =>
        showContexts
          ? getContextsSortedAndRanked(state, headValue(state, parentOf(simplePath)))[0]
          : firstVisibleChild(state, context),
      )

      // Typescript validates with apply but not spread operator here
      // eslint-disable-next-line prefer-spread
      return setCursorOrBack.apply(
        null,
        prev
          ? [appendToPath(parentOf(path), prev.id), { offset: prev.value.length }]
          : // Case II: set cursor on next thought
          next()
          ? [
              unroot(showContexts ? appendToPath(parentOf(path), next().id) : appendToPath(parentOf(path), next().id)),
              { offset: 0 },
            ]
          : // Case III: delete last thought in context; set cursor on context
          thoughts.length > 1
          ? [rootedParentOf(state, path), { offset: getTextContentFromHTML(head(context)).length }]
          : // Case IV: delete very last thought; remove cursor
            [null],
      )(state)
    },

    setNativeCaretSelection({ value: false }),
  ])(state)
}

export default _.curryRight(deleteThoughtWithCursor)
