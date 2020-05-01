import { store } from '../store.js'

import {
  RANKED_ROOT,
  ROOT_TOKEN,
} from '../constants.js'
// util
import {
  contextOf,
  getContextsSortedAndRanked,
  getSortPreference,
  getThought,
  getThoughtsRanked,
  getThoughtsSorted,
  head,
  isFunction,
  meta,
  pathToContext,
  perma,
  rootedContextOf,
  splitChain,
  nextSibling as thoughtNextSibling,
  unroot,
} from '../util.js'
import { isContextViewActive } from './isContextViewActive.js'

const contextToThought = (context, thoughtIndex) => context.map(contextValue => {
  const thought = getThought(contextValue, thoughtIndex)
  return { value: thought.value, rank: thought.contexts[0] && thought.contexts[0].rank }
})

const mapContextsToThoughts = (contexts, thoughtIndex) => contexts.map(({ context }) => contextToThought(context, thoughtIndex))

const isValidContextView = context => {
  // const allowSingleContext = false
  if (!context.length) {
    return false
  }
  return isContextViewActive(context) && getContextsSortedAndRanked(head(pathToContext(context))).length > 1
}

const getContextSiblings = (context, thoughtIndex) => {
  const contexts = getContextsSortedAndRanked(head(context))
  return mapContextsToThoughts(contexts, thoughtIndex)
}

const nextSiblingContext = (value, rank, context, thoughtIndex) => {
  const contextSiblings = getContextSiblings(context, thoughtIndex)
  const currentIndex = contextSiblings.findIndex(thoughts => thoughts.find(thought => thought.value === value))
  return contextSiblings[currentIndex + 1]
}

const firstChildOfContext = (value, cursor, thoughtIndex) => {
  const context = pathToContext(cursor)
  const contextSiblings = getContextSiblings(context, thoughtIndex)
  return contextSiblings[0]
}

const getSubThought = (thoughtsRanked, showHiddenThoughts) => {
  const contextMeta = meta(thoughtsRanked)
  const sortPreference = getSortPreference(contextMeta)
  const children = (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(thoughtsRanked)
  const notHidden = child => !isFunction(child.value) && !meta(pathToContext(thoughtsRanked).concat(child.value)).hidden
  const childrenFiltered = showHiddenThoughts ? children : children.filter(notHidden)
  return childrenFiltered[0]
}

const getPathFromContextChain = contextChain => {
  // last of second last item in context chain gives us the current context
  const context = head(head(contextOf(contextChain)))
  const contexts = getContextsSortedAndRanked(context.value)
  const currentContextTop = head(contextChain)[0].value
  const matchedContextChain = contexts.find(c => c.context.includes(currentContextTop))
  const matchedContext = matchedContextChain.context.map(i => ({ value: i, rank: matchedContextChain.rank }))

  return [...matchedContext, context, ...head(contextChain).slice(1)]
}

const getNextThoughtsAndContextChainFromContextview = (value, context, rank, cursor, rankedContext, contextChain, ignoreChildren) => {
  const { showHiddenThoughts, thoughtIndex } = store.getState()

  if (context.length === 0 || cursor.length === 0) {
    return null
  }

  // if the cursor is at a thought with context view open, move it into context view - jump in
  if (isValidContextView(pathToContext(cursor))) {
    const currentThought = head(cursor)
    const firstChild = firstChildOfContext(value, cursor, thoughtIndex)
    if (!ignoreChildren && firstChild) {
      return { nextThoughts: [...firstChild, currentThought], contextChain }
    }
    // jump out if there are no context children
    return getNextThoughtsWithContextChain(value, context, rank, cursor, contextOf(rankedContext), contextOf(contextChain))
  }
  // if cursor is within a context view
  else if (isValidContextView(rankedContext)) {
    const getFirstChild = perma(() => getSubThought(getPathFromContextChain(contextChain) || RANKED_ROOT, showHiddenThoughts))

    const nextSibling = nextSiblingContext(value, rank, context, thoughtIndex, showHiddenThoughts)
    const rankedContextHead = head(rankedContext)

    if (!ignoreChildren) {
      const firstChild = getFirstChild()
      if (firstChild) {
        return { nextThoughts: unroot(cursor.concat(firstChild)), contextChain: [] }
      }
    }
    return nextSibling ? { nextThoughts: [...nextSibling, rankedContextHead], contextChain: contextOf(contextChain) } :
      getNextThoughtsAndContextChainFromThoughtview(rankedContextHead.value, contextOf(context), rankedContextHead.rank, contextOf(cursor), contextOf(contextChain), true)
  }
  const contextWithNoChildren = contextChain.length === 1 && isContextViewActive(contextChain[0]) && getContextsSortedAndRanked(head(pathToContext(contextChain[0]))).length <= 1

  // not a valid context view. Try navigating thoughts
  return getNextThoughtsAndContextChainFromThoughtview(value, context, rank, cursor, contextChain, contextWithNoChildren)
}

const getNextThoughtsAndContextChainFromThoughtview = (value, context, rank, cursor, contextChain, ignoreChildren) => {
  const { showHiddenThoughts } = store.getState()

  if (contextChain.length > 1 && head(contextChain).length === 1) {
    return
  }
  const thoughtViewCursor = !ignoreChildren && contextChain.length > 1 ? getPathFromContextChain(contextChain) : cursor
  const thoughtViewRankedContext = contextOf(thoughtViewCursor)
  // pathToContext is expensive than duplicate condition check hence using the former
  const thoughtViewContext = !ignoreChildren && contextChain.length > 1 ? pathToContext(contextOf(thoughtViewCursor)) : context

  const getUncleThoughtsAndContextChainFromThoughtview = perma(() => {
    const sortPreference = getSortPreference(meta(pathToContext(thoughtViewContext)))
    const siblings = sortPreference === 'Alphabetical' ? getThoughtsSorted(thoughtViewContext) : getThoughtsRanked(thoughtViewContext)

    const parentThought = head(contextOf(thoughtViewCursor))
    const parentContext = context.length === 1 ? [ROOT_TOKEN] : contextOf(thoughtViewContext)
    const contextChainForParentThought = [...contextOf(contextChain), contextOf(head(contextChain))]
    const parentCursor = contextOf(thoughtViewCursor)

    // reached root thought
    if (!parentThought) {
      return { nextThoughts: [siblings[0] || ROOT_TOKEN], contextChain: [] }
    }
    return getNextThoughtsAndContextChainFromThoughtview(parentThought.value, parentContext, parentThought.rank, parentCursor, contextChainForParentThought, true)

  })

  const getUncleThoughtsAndContextChainFromContextview = perma(() => {
    const cursorToFirstThoughtInContext = contextOf(contextChain.length > 1 ? contextChain.flat() : thoughtViewCursor)
    // restricts from working with multilevel context chains
    const rankedContextOfCurrentContext = contextOf(contextChain)[0]
    const contextChainTillFirstChildOfContext = [...contextOf(contextChain), [head(contextChain)[0]]]
    const firstThoughtInContext = head(contextChain)[0]

    return getNextThoughtsAndContextChainFromContextview(firstThoughtInContext.value, pathToContext(rankedContextOfCurrentContext), firstThoughtInContext.rank, cursorToFirstThoughtInContext, rankedContextOfCurrentContext, contextChainTillFirstChildOfContext, true)

  })

  const firstChild = getSubThought(thoughtViewCursor || RANKED_ROOT, showHiddenThoughts)
  if (!ignoreChildren && firstChild) {
    return { nextThoughts: unroot(cursor.concat(firstChild)), contextChain: [] }
  }

  const nextSibling = thoughtNextSibling(value, thoughtViewContext, rank, showHiddenThoughts)
  return nextSibling ? { nextThoughts: unroot(thoughtViewRankedContext.concat(nextSibling)), contextChain: contextOf(contextChain) } : getUncleThoughtsAndContextChainFromThoughtview() || getUncleThoughtsAndContextChainFromContextview()
}

/** Gets nextThoughts and their respective contextChain */
export const getNextThoughtsWithContextChain = cursor => {
  const { contextViews } = store.getState()
  const { value, rank } = head(cursor)
  const rankedContext = rootedContextOf(cursor)
  const context = pathToContext(rankedContext)
  const contextChain = splitChain(cursor, contextViews)

  return getNextThoughtsAndContextChainFromContextview(value, context, rank, cursor, rankedContext, contextChain)
}
