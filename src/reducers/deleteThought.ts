import _ from 'lodash'
import { RANKED_ROOT } from '../constants'
import { cursorBack, existingThoughtDelete, setCursor } from '../reducers'
import { State } from '../util/initialState'
import { Child, Path, ThoughtContext } from '../types'

// util
import {
  contextOf,
  head,
  headValue,
  pathToContext,
  perma,
  reducerFlow,
  rootedContextOf,
  unroot,
} from '../util'

// selectors
import {
  firstVisibleChild,
  getContexts,
  getContextsSortedAndRanked,
  isContextViewActive,
  lastThoughtsFromContextChain,
  prevSibling,
  rankThoughtsFirstMatch,
  splitChain,
  thoughtsEditingFromChain,
} from '../selectors'

/** Deletes a thought. */
const deleteThought = (state: State, { path }: { path?: Path }) => {

  path = path || state.cursor || undefined

  if (!path) return state

  // same as in newThought
  const showContexts = isContextViewActive(state, pathToContext(contextOf(path)))
  if (showContexts) {
    // Get thought in ContextView
    const thoughtInContextView = head(contextOf(path))
    // Get context from which we are going to delete thought
    const context = getContexts(state, thoughtInContextView.value).map(({ context }) => context).find(context => head(context) === headValue(path!))
    if (context) {
      // Convert to path
      path = rankThoughtsFirstMatch(state, [...context, thoughtInContextView.value])
    }
  }
  const contextChain = splitChain(state, path)
  const thoughtsRanked = contextChain.length > 1
    ? lastThoughtsFromContextChain(state, contextChain)
    : path
  const context = pathToContext(showContexts && contextChain.length > 1 ? contextChain[contextChain.length - 2]
    : !showContexts && thoughtsRanked.length > 1 ? contextOf(thoughtsRanked) :
    RANKED_ROOT)

  const { value, rank } = head(thoughtsRanked)
  const thoughts = pathToContext(thoughtsRanked)

  /** Calculates the previous context within a context view. */
  const prevContext = () => {
    const thoughtsContextView = thoughtsEditingFromChain(state, thoughtsRanked)
    const prevContext = perma(() => {
      const contexts = getContextsSortedAndRanked(state, headValue(thoughtsContextView))
      const removedContextIndex = contexts.findIndex(context => head(context.context) === value)
      return contexts[removedContextIndex - 1]
    })
    const context = prevContext()
    return context && {
      value: head(context.context),
      rank: prevContext().rank
    }
  }

  // prev must be calculated before dispatching existingThoughtDelete
  const prev = showContexts
    ? prevContext()
    : prevSibling(state, value, context, rank)

  /** Sets the cursor or moves it back if it doesn't exist. */
  const setCursorOrBack = (thoughtsRanked: Path, { offset }: { offset?: number } = {}) => thoughtsRanked
    ? (state: State) => setCursor(state, {
      thoughtsRanked,
      editing: state.editing,
      offset
    })
    : cursorBack

  return reducerFlow([

    // delete thought
    existingThoughtDelete({
      context: contextOf(pathToContext(thoughtsRanked)),
      showContexts,
      thoughtRanked: head(thoughtsRanked)
    }),

    // move cursor
    state => {

      const next: () => Child | ThoughtContext = perma(() => showContexts
        ? getContextsSortedAndRanked(state, headValue(contextOf(path as Path)))[0]
        : firstVisibleChild(state, context)
      )

      // @ts-ignore
      return setCursorOrBack(...prev ? [unroot(contextOf(path).concat(prev)), { offset: prev.value.length }] :
        // Case II: set cursor on next thought
        next() ? [unroot(showContexts
          ? contextOf(path as Path).concat({ value: head((next() as ThoughtContext).context), rank: next().rank })
          : contextOf(path as Path).concat(next() as Child)
        ), { offset: 0 }] :
        // Case III: delete last thought in context; set cursor on context
        thoughts.length > 1 ? [rootedContextOf(path as Path), { offset: head(context).length }]
        // Case IV: delete very last thought; remove cursor
        : [null]
      )(state)
    }

  ])(state)

}

export default _.curryRight(deleteThought)
