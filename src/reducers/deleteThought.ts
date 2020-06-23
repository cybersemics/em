import { RANKED_ROOT } from '../constants'
import { cursorBack, existingThoughtDelete, setCursor } from '../reducers'
import { State } from '../util/initialState'
import { Child, Path, ThoughtContext } from '../types'

// util
import {
  concatOne,
  contextOf,
  head,
  headValue,
  isFunction,
  pathToContext,
  perma,
  reducerFlow,
  rootedContextOf,
  unroot,
} from '../util'

// selectors
import {
  getContextsSortedAndRanked,
  getSortPreference,
  getThoughtsRanked,
  getThoughtsSorted,
  hasChild,
  isContextViewActive,
  lastThoughtsFromContextChain,
  prevSibling,
  splitChain,
  thoughtsEditingFromChain,
} from '../selectors'

/** Deletes a thought. */
const deleteThought = (state: State, { path }: { path?: Path } = {}) => {

  path = path || state.cursor || undefined

  if (!path) return state

  // same as in newThought
  const contextChain = splitChain(state, path)
  const showContexts = isContextViewActive(state, pathToContext(contextOf(path)))
  const thoughtsRanked = contextChain.length > 1
    ? lastThoughtsFromContextChain(state, contextChain)
    : path
  const context = pathToContext(showContexts && contextChain.length > 1 ? contextChain[contextChain.length - 2]
    : !showContexts && thoughtsRanked.length > 1 ? contextOf(thoughtsRanked) :
    RANKED_ROOT)

  const sortPreference = getSortPreference(state, context)

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
    return showContexts ? {
      value: head(prevContext().context),
      rank: prevContext().rank
    } : null
  }

  // prev must be calculated before dispatching existingThoughtDelete
  const prev = showContexts
    ? prevContext()
    : prevSibling(state, value, context, rank)

  /** Returns true when thought is not hidden due to being a function or having a =hidden attribute. */
  const isVisible = (child: Child) => state.showHiddenThoughts || (
    !isFunction(child.value) &&
    !hasChild(state, concatOne(context, child.value), '=hidden')
  )

  /** Sets the cursor or moves it back if it doesn't exist. */
  const setCursorOrBack = (thoughtsRanked: Path, { offset }: { offset?: number } = {}) => thoughtsRanked
    // @ts-ignore
    ? state => setCursor(state, {
      thoughtsRanked,
      editing: state.editing,
      offset
    })
    : cursorBack

  return reducerFlow([

    // delete thought
    state => existingThoughtDelete(state, {
      context: contextOf(pathToContext(thoughtsRanked)),
      showContexts,
      thoughtRanked: head(thoughtsRanked)
    }),

    // move cursor
    state => {

      const next: () => Child | ThoughtContext = perma(() => showContexts
        ? getContextsSortedAndRanked(state, headValue(contextOf(path as Path)))[0]
        // get first visible thought
        : (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(state, context)
          .find(isVisible)
      )

      // @ts-ignore
      return setCursorOrBack(...prev ? [unroot(contextOf(path).concat(prev)), { offset: prev.value.length }] :
        // Case II: set cursor on next thought
        next() ? [unroot(showContexts
          // eslint-disable-next-line no-extra-parens
          ? contextOf(path as Path).concat({ value: head((next() as ThoughtContext).context), rank: next().rank })
          // eslint-disable-next-line no-extra-parens
          : contextOf(path as Path).concat((next() as Child))
        ), { offset: 0 }] :
        // Case III: delete last thought in context; set cursor on context
        thoughts.length > 1 ? [rootedContextOf(path as Path), { offset: head(context).length }]
        // Case IV: delete very last thought; remove cursor
        : [null]
      )(state)
    }

  ])(state)

}

export default deleteThought
