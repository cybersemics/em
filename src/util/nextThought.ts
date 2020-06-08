// @ts-nocheck

// constants
import {
  ALLOW_SINGLE_CONTEXT,
  RANKED_ROOT,
  ROOT_TOKEN,
} from '../constants.js'

// util
import {
  contextOf,
  equalArrays,
  head,
  isFunction,
  pathToContext,
  perma,
  rootedContextOf,
  unroot,
} from '../util'

import {
  getContexts,
  getContextsSortedAndRanked,
  getSortPreference,
  getThought,
  getThoughtsRanked,
  getThoughtsSorted,
  hasChild,
  isContextViewActive,
  splitChain,
  nextSibling as thoughtNextSibling,
} from '../selectors'

/**
 * Adds the rank of the child thought to every thought in a context.
 *
 * @param contextInfo   A { context, rank } object returned from getContexts.
 * @returns Returns rankedContext.
 */
const contextWithThoughtRank = (state, contextInfo) => {
  return contextInfo && contextInfo.context.map((value, index) => {
    const thought = getThought(state, value)

    /** Returns the matching context. */
    const matchedContext = () => {
      const contextToMatch = contextInfo.context.slice(0, index + 1)
      // const filterRoot = context => context.filter(item => item !== ROOT_TOKEN)
      return thought.contexts.find(thoughtContext => equalArrays([...unroot(thoughtContext.context), thought.value], contextToMatch))
    }
    // the root thought doesn't have a rank
    return value === ROOT_TOKEN ? RANKED_ROOT[0] : { value, rank: matchedContext().rank }
  })
}

/**
 * Returns the next sibling of the focused context within a context view.
 *
 * @returns Returns rankedContext.
 */
const nextSiblingContext = (state, rank, context, thoughtIndex) => {
  const contextSiblings = getContextsSortedAndRanked(state, head(context))
  const currentContextIndex = contextSiblings.findIndex(context => context.rank === rank)
  // const currentIndex = contextSiblings.findIndex(thoughts => thoughts.find(thought => thought.value === value))
  const nextSibling = contextSiblings[currentContextIndex + 1]
    ? contextSiblings[currentContextIndex + 1]
    : null
  return contextWithThoughtRank(state, nextSibling, thoughtIndex)
}

/**
 * Returns the first child of context at the given path.
 *
 * @returns Returns rankedContext.
 */
const firstChildOfContextView = (state, path, thoughtIndex) => {
  const context = pathToContext(path)
  const contextChildren = getContextsSortedAndRanked(head(context))
  const firstChild = contextChildren[0]
  return contextWithThoughtRank(state, firstChild, thoughtIndex)
}

/**
 * Returns the first visible child of thought at the given path.
 *
 * @returns Returns thought.
 */
const firstChildOfThoughtView = (state, context, showHiddenThoughts) => {
  const sortPreference = getSortPreference(state, context)
  const children = (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(state, context)

  /** Returns true if the child is not hidden due to being a function or having the =hidden attribute. */
  const notHidden = child => !isFunction(child.value) && !hasChild(state, [...context, child.value], '=hidden')

  return showHiddenThoughts ? children[0] : children.find(notHidden)
}

/**
 * Returns the context that is currently in focus based on the context chain head.
 *
 * @returns Returns context.
 */
const getMatchedContext = (context, contextChain) => {
  const contexts = getContextsSortedAndRanked(context.value)
  const currentContextTop = head(contextChain)[0].value
  return contexts.find(c => c.context.includes(currentContextTop))
}

/**
 * Returns the path to the current thought by stripping out any context views.
 *
 * @returns Returns path.
 */
const getPathFromContextChain = contextChain => {
  // last of second last item in context chain gives us the current context
  const context = head(head(contextOf(contextChain)))
  const matchedContextWithRanks = contextWithThoughtRank(getMatchedContext(context, contextChain))
  return [...matchedContextWithRanks, context, ...head(contextChain).slice(1)]
}

/**
 * Returns the context of the current thought by stripping out any context views.
 *
 * @returns Returns context.
 */
const getContextFromContextChain = contextChain => {
  // last of second last item in context chain gives us the current context
  const context = head(head(contextOf(contextChain)))
  const matchedContext = getMatchedContext(context, contextChain)
  return [...matchedContext.context, context.value, ...head(contextChain).slice(1).map(context => context.value)]
}

/**
 * Computes the value of next thoughts and context chain if:
 *
 * 1) The focused thought has context view open.
 * 2) The focus is on a context.
 *
 * Delegates control to nextInThoughtView if none of the above conditions meet.
 *
 * @param value             The value of focused thought.
 * @param rank              Rank of focused thought.
 * @param path              Path to focused thought.
 * @param rankedContext     Context with rank.
 * @param contextChain      ContextChain for the focused thought.
 * @param ignoreChildren    Used to ignore the children context if they've been traversed already.
 */
const nextInContextView = (state, value, rank, path, rankedContext, contextChain, ignoreChildren) => {
  const { showHiddenThoughts, thoughtIndex } = state

  if (rankedContext.length === 0 || path.length === 0) return null

  const context = pathToContext(rankedContext)
  const firstChild = perma(() => firstChildOfContextView(state, path, thoughtIndex))

  const contextWithoutChildren = isContextViewActive(state, pathToContext(path)) &&
    getContexts(state, head(path).value).length < (ALLOW_SINGLE_CONTEXT ? 2 : 1)

  if (contextWithoutChildren && contextChain.length === 1) {
    return nextInThoughtView(value, context, rank, path, contextChain, true)
  }

  // if the focus is on a thought with context view open, move it into context view - jump in
  if (!contextWithoutChildren && !ignoreChildren && isContextViewActive(state, pathToContext(path)) && firstChild()) {
    const currentThought = head(path)
    // jump out if there are no context children
    return {
      nextThoughts: [...firstChild(), currentThought],
      contextChain
    }
  }
  // if the focus is on or within a context
  else if (isContextViewActive(state, pathToContext(rankedContext))) {
    const firstChild = perma(() => firstChildOfThoughtView(state, getContextFromContextChain(contextChain) || RANKED_ROOT, showHiddenThoughts))

    const nextSibling = nextSiblingContext(state, rank, context, thoughtIndex, showHiddenThoughts)
    const rankedContextHead = head(rankedContext)

    return !ignoreChildren && firstChild() ? {
      nextThoughts: unroot([...path, firstChild()]),
      contextChain: []
    }
      : nextSibling ? {
        nextThoughts: [...nextSibling, rankedContextHead],
        contextChain: contextOf(contextChain)
      }
      : nextInThoughtView(rankedContextHead.value, contextOf(context), rankedContextHead.rank, contextOf(path), contextOf(contextChain), true)
  }
}

/**
 * Computes the value of next thoughts  and context chain if:
 *
 * 1) The focused thought is not within a context view.
 * 2) The focused thought is at level 2 or further down in a context tree.
 *
 * Delegates control to nextInContextView if none of the above conditions meet.
 *
 * @param value          The value of focused thought.
 * @param context        Context of focused thought.
 * @param rank           Rank of focused thought.
 * @param path           Path to focsued thought.
 * @param rankedContext  Context with rank.
 * @param contextChain   ContextChain for the focused thought.
 * @param ignoreChildren Used to ignore the subthoughts if they've been traversed already.
 */
const nextInThoughtView = (state, value, context, rank, path, contextChain, ignoreChildren) => {
  const { showHiddenThoughts } = state

  if (contextChain.length > 1 && head(contextChain).length === 1) return

  const firstChild = !ignoreChildren && firstChildOfThoughtView(state, contextChain.length > 1 ? getContextFromContextChain(contextChain) : path || RANKED_ROOT, showHiddenThoughts)

  const thoughtViewPath = perma(() => !ignoreChildren && contextChain.length > 1 ? getPathFromContextChain(contextChain) : path)
  // pathToContext is expensive than duplicate condition check hence using the former
  const thoughtViewContext = perma(() => !ignoreChildren && contextChain.length > 1 ? pathToContext(contextOf(thoughtViewPath())) : context)

  /** Returns the next uncle in the thought view. */
  const nextUncleInThoughtView = () => {
    const parentThought = head(contextOf(thoughtViewPath()))

    /** Gets the next uncle.
     * Only calculate uncle if not at root.
     */
    const nextUncle = () => {
      const parentContext = context.length === 1 ? [ROOT_TOKEN] : contextOf(thoughtViewContext())
      const contextChainForParentThought = [...contextOf(contextChain), contextOf(head(contextChain))]
      const parentPath = contextOf(thoughtViewPath())
      return nextInThoughtView(state, parentThought.value, parentContext, parentThought.rank, parentPath, contextChainForParentThought, true)
    }

    return parentThought
      ? nextUncle()
      // reached root thought
      : {
        nextThoughts: [],
        contextChain
      }
  }

  /** Gets the next uncle in the Context View. */
  const nextUncleInContextView = () => {
    const pathToFirstThoughtInContext = contextOf(contextChain.length > 1 ? contextChain.flat() : thoughtViewPath)
    // restricts from working with multilevel context chains
    const rankedContextOfCurrentContext = contextOf(contextChain)[0]
    const contextChainTillFirstChildOfContext = [...contextOf(contextChain), [head(contextChain)[0]]]
    const firstThoughtInContext = head(contextChain)[0]

    return nextInContextView(firstThoughtInContext.value, firstThoughtInContext.rank, pathToFirstThoughtInContext, rankedContextOfCurrentContext, contextChainTillFirstChildOfContext, true)
  }

  const nextSibling = perma(() => thoughtNextSibling(state, value, thoughtViewContext(), rank, showHiddenThoughts))

  return firstChild ?
    {
      nextThoughts: unroot(path.concat(firstChild)),
      contextChain: []
    }
    : nextSibling() ? {
      nextThoughts: unroot(contextOf(thoughtViewPath()).concat(nextSibling())),
      contextChain: contextOf(contextChain)
    } : nextUncleInThoughtView() || nextUncleInContextView()
}

/** Gets the next thought whether it is a child, sibling, or uncle, and its respective contextChain. */
export const nextThought = (state, path = RANKED_ROOT) => {
  const { contextViews } = state
  const { value, rank } = head(path)
  const rankedContext = rootedContextOf(path)
  const contextChain = splitChain(state, path, contextViews)
  const context = pathToContext(rankedContext)

  return isContextViewActive(state, pathToContext(rankedContext)) || isContextViewActive(state, pathToContext(path))
    ? nextInContextView(state, value, rank, path, rankedContext, contextChain)
    : nextInThoughtView(state, value, context, rank, path, contextChain)
}
