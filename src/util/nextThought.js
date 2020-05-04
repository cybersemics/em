import { store } from '../store.js'

// constants
import {
  RANKED_ROOT,
  ROOT_TOKEN,
} from '../constants.js'

// util
import {
  contextOf,
  getContexts,
  getContextsSortedAndRanked,
  getSortPreference,
  getThought,
  getThoughtsRanked,
  getThoughtsSorted,
  head,
  isContextViewActive,
  isFunction,
  meta,
  pathToContext,
  perma,
  rootedContextOf,
  splitChain,
  nextSibling as thoughtNextSibling,
  unroot,
} from '../util.js'
import { equalArrays } from './equalArrays.js'

/**
 * Returns true if the context view is activated and has more than one context
 * @returns {boolean}
 */
const isValidContextView = path =>
  path.length &&
  isContextViewActive(pathToContext(path))

/**
 * Adds the rank of the child thought to every thought in a context.
 * @param {ContextInfo} contextInfo.   A { context, rank } object returned from getContexts.
 * @returns {array | null} rankedContext
 */
const contextWithThoughtRank = contextInfo => {
  return contextInfo && contextInfo.context.map((value, index) => {
    const thought = getThought(value)
    const matchedContext = () => {
      const contextToMatch = contextInfo.context.slice(0, index + 1)
      const filterRoot = context => context.filter(item => item !== ROOT_TOKEN)
      return thought.contexts.length < 1 ? thought.contexts[0] : thought.contexts.find(thoughtContext => equalArrays([...filterRoot(thoughtContext.context), thought.value], contextToMatch))
    }
    // the root thought doesn't have a rank
    return { ...(thought || { value }), rank: value === ROOT_TOKEN ? contextInfo.rank : matchedContext().rank }
  })
}

/**
 * Returns the next sibling of the focused context within a context view.
 * @returns {array | null} rankedContext
 */
const nextSiblingContext = (rank, context, thoughtIndex) => {
  const contextSiblings = getContextsSortedAndRanked(head(context))
  const currentContextIndex = contextSiblings.findIndex(context => context.rank === rank)
  // const currentIndex = contextSiblings.findIndex(thoughts => thoughts.find(thought => thought.value === value))
  const nextSibling = contextSiblings[currentContextIndex + 1]
    ? contextSiblings[currentContextIndex + 1]
    : null
  return contextWithThoughtRank(nextSibling, thoughtIndex)
}

/**
 * Returns the first child of context at the given path
 * @returns {array | undefined} rankedContext
 */
const firstChildOfContextView = (path, thoughtIndex) => {
  const context = pathToContext(path)
  const contextChildren = getContextsSortedAndRanked(head(context))
  const firstChild = contextChildren[0]
  return contextWithThoughtRank(firstChild, thoughtIndex)
}

/**
 * Returns the first visible child of thought at the given path
 * @returns {object | undefined} thought
 */
const firstChildOfThoughtView = (path, showHiddenThoughts) => {
  const contextMeta = meta(path)
  const sortPreference = getSortPreference(contextMeta)
  const children = (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(path)
  const notHidden = child => !isFunction(child.value) && !meta(pathToContext(path).concat(child.value)).hidden
  return showHiddenThoughts ? children[0] : children.find(notHidden)
}

/**
 * Returns the path to the current thought by stripping out any context views
 * @returns {array} path
 */
const getPathFromContextChain = contextChain => {
  // last of second last item in context chain gives us the current context
  const context = head(head(contextOf(contextChain)))
  const contexts = getContextsSortedAndRanked(context.value)
  const currentContextTop = head(contextChain)[0].value
  const matchedContextChain = contexts.find(c => c.context.includes(currentContextTop))
  const matchedContext = contextWithThoughtRank(matchedContextChain)
  return [...matchedContext, context, ...head(contextChain).slice(1)]
}

/**
 * Computes the value of next thoughts  and context chain if-
 * 1) the focused thought has context view open
 * 2) the focus is on a context
 * Delegates control to nextInThoughtView if none of the above conditions meet
 * @param {string} value - The value of focused thought
 * @param {string} rank - Rank of focused thought
 * @param {array} path - Path to focsued thought
 * @param {array} rankedContext - Context with rank
 * @param {array} contextChain - ContextChain for the focused thought
 * @param {(boolean | undefined)} ignoreChildren - Used to ignore the children context if they've been traversed already
*/
const nextInContextView = (value, rank, path, rankedContext, contextChain, ignoreChildren) => {
  const { showHiddenThoughts, thoughtIndex } = store.getState()

  if (rankedContext.length === 0 || path.length === 0) return null

  const context = pathToContext(rankedContext)
  const firstChild = perma(() => firstChildOfContextView(path, thoughtIndex))

  const contextWithoutChildren = contextChain.length === 1 &&
  isContextViewActive(contextChain[0]) &&
  getContexts(head(pathToContext(contextChain[0]))).length <= 1

  if (contextWithoutChildren) {
    return nextInThoughtView(value, context, rank, path, contextChain, true)
  }

  // if the focus is on a thought with context view open, move it into context view - jump in
  if (!ignoreChildren && isValidContextView(path) && firstChild()) {
    const currentThought = head(path)
    // jump out if there are no context children
    return {
      nextThoughts: [...firstChild(), currentThought],
      contextChain
    }
  }
  // if the focus is on or within a context
  else if (isValidContextView(rankedContext)) {
    const firstChild = perma(() => firstChildOfThoughtView(getPathFromContextChain(contextChain) || RANKED_ROOT, showHiddenThoughts))

    const nextSibling = nextSiblingContext(rank, context, thoughtIndex, showHiddenThoughts)
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
 * Computes the value of next thoughts  and context chain if-
 * 1) the focused thought is not within a context view
 * 2) the focused thought is at level 2 or further down in a context tree
 * Delegates control to nextInContextView if none of the above conditions meet
 * @param {string} value - The value of focused thought
 * @param {array} context - Context of focused thought
 * @param {string} rank - Rank of focused thought
 * @param {array} path - Path to focsued thought
 * @param {array} rankedContext - Context with rank
 * @param {array} contextChain - ContextChain for the focused thought
 * @param {(boolean | undefined)} ignoreChildren - Used to ignore the subthoughts if they've been traversed already
 */
const nextInThoughtView = (value, context, rank, path, contextChain, ignoreChildren) => {
  const { showHiddenThoughts } = store.getState()

  if (contextChain.length > 1 && head(contextChain).length === 1) return

  const thoughtViewPath = !ignoreChildren && contextChain.length > 1 ? getPathFromContextChain(contextChain) : path
  const thoughtViewRankedContext = contextOf(thoughtViewPath)
  // pathToContext is expensive than duplicate condition check hence using the former
  const thoughtViewContext = !ignoreChildren && contextChain.length > 1 ? pathToContext(contextOf(thoughtViewPath)) : context

  const nextUncleInThoughtView = () => {
    const parentThought = head(contextOf(thoughtViewPath))

    // get sorted siblings
    const siblings = () => {
      const sortPreference = getSortPreference(meta(thoughtViewContext))
      return (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(thoughtViewContext)
    }

    // only calculate uncle if not at root
    const nextUncle = () => {
      const parentContext = context.length === 1 ? [ROOT_TOKEN] : contextOf(thoughtViewContext)
      const contextChainForParentThought = [...contextOf(contextChain), contextOf(head(contextChain))]
      const parentPath = contextOf(thoughtViewPath)
      return nextInThoughtView(parentThought.value, parentContext, parentThought.rank, parentPath, contextChainForParentThought, true)
    }

    return parentThought
      ? nextUncle()
      // reached root thought
      : {
        nextThoughts: [siblings()[0] || ROOT_TOKEN],
        contextChain: []
      }
  }

  const nextUncleInContextView = () => {
    const pathToFirstThoughtInContext = contextOf(contextChain.length > 1 ? contextChain.flat() : thoughtViewPath)
    // restricts from working with multilevel context chains
    const rankedContextOfCurrentContext = contextOf(contextChain)[0]
    const contextChainTillFirstChildOfContext = [...contextOf(contextChain), [head(contextChain)[0]]]
    const firstThoughtInContext = head(contextChain)[0]

    return nextInContextView(firstThoughtInContext.value, firstThoughtInContext.rank, pathToFirstThoughtInContext, rankedContextOfCurrentContext, contextChainTillFirstChildOfContext, true)
  }

  const firstChild = firstChildOfThoughtView(thoughtViewPath || RANKED_ROOT, showHiddenThoughts)
  const nextSibling = perma(() => thoughtNextSibling(value, thoughtViewContext, rank, showHiddenThoughts))

  return !ignoreChildren && firstChild ?
    {
      nextThoughts: unroot(path.concat(firstChild)),
      contextChain: []
    }
    : nextSibling() ? {
      nextThoughts: unroot(thoughtViewRankedContext.concat(nextSibling())),
      contextChain: contextOf(contextChain)
    } : nextUncleInThoughtView() || nextUncleInContextView()
}

/** Gets the next thought whether it is a child, sibling, or uncle, and its respective contextChain */
export const nextThought = path => {
  const { contextViews } = store.getState()
  if (!path) {
    path = RANKED_ROOT
  }
  const { value, rank } = head(path)
  const rankedContext = rootedContextOf(path)
  const contextChain = splitChain(path, contextViews)
  const context = pathToContext(rankedContext)

  if (isValidContextView(rankedContext) || isValidContextView(path)) {
    return nextInContextView(value, rank, path, rankedContext, contextChain)
  }
  else {
  // not a valid context view. Try navigating thoughts
    return nextInThoughtView(value, context, rank, path, contextChain)
  }

  // return nextInContextView(value, rank, path, rankedContext, contextChain)
}
