import { store } from '../store.js'

import {
  ROOT_TOKEN,
  RANKED_ROOT
} from '../constants.js'
// util
import {
  head,
  contextOf,
  unroot,
  getThoughtsRanked,
  getThoughtsSorted,
  getSortPreference,
  isFunction,
  meta,
  pathToContext,
  getContextsSortedAndRanked,
  getThought,
  splitChain,
  nextSibling as thoughtNextSibling
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

const firstChildOfThought = (thoughtsRanked, showHiddenThoughts) => {
  const contextMeta = meta(thoughtsRanked)
  const sortPreference = getSortPreference(contextMeta)
  const children = (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(thoughtsRanked)
  const notHidden = child => !isFunction(child.value) && !meta(pathToContext(thoughtsRanked).concat(child.value)).hidden
  const childrenFiltered = showHiddenThoughts ? children : children.filter(notHidden)
  return childrenFiltered[0]
}

const getDerivedCursor = contextChain => {
  // last of second last item in context chain gives us the current context
  const context = head(contextChain.slice(-2, -1)[0])
  const contexts = getContextsSortedAndRanked(context.value)
  const currentContextTop = head(contextChain)[0].value
  const matchedContextChain = contexts.find(c => c.context.includes(currentContextTop))
  const matchedContext = matchedContextChain.context.map(i => ({ value: i, rank: matchedContextChain.rank }))

  return [...matchedContext, context, ...head(contextChain).slice(1)]
}

const contextViewLookup = (value, context, rank, cursor, contextRanked, contextChain, ignoreChildren) => {
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
    return getNextThoughtsWithContextChain(value, context, rank, cursor, contextOf(contextRanked), contextOf(contextChain))
  }
  // if cursor is within a context view
  else if (isValidContextView(contextRanked)) {
    const headContext = contextOf(cursor).map(c => c.value)
    if (!ignoreChildren && isValidContextView(headContext)) {
      const derivedCursor = getDerivedCursor(contextChain)
      const firstChild = firstChildOfThought(derivedCursor || RANKED_ROOT, showHiddenThoughts)
      if (firstChild) {
        return { nextThoughts: unroot(cursor.concat(firstChild)), contextChain: [] }
      }
    }

    const derivedContextRanked = (contextChain.length === 1 && isValidContextView(contextChain[0])) ? contextChain[0] : contextRanked
    const derivedContext = derivedContextRanked.map(c => c.value)
    const nextSibling = nextSiblingContext(value, rank, derivedContext, thoughtIndex, showHiddenThoughts)
    const contextRankedHead = head(derivedContextRanked)

    if (nextSibling) {
      return { nextThoughts: [...nextSibling, contextRankedHead], contextChain: contextOf(contextChain) }
    }
    // jump out
    return thoughtViewLookUp(contextRankedHead.value, contextOf(derivedContext), contextRankedHead.rank, contextOf(cursor), contextOf(contextChain), true)
  }
  const contextWithNoChildren = contextChain.length === 1 && isContextViewActive(contextChain[0]) && getContextsSortedAndRanked(head(pathToContext(contextChain[0]))).length <= 1
  return thoughtViewLookUp(value, context, rank, cursor, contextChain, contextWithNoChildren)
}

const thoughtViewLookUp = (value, context, rank, cursor, contextChain, ignoreChildren) => {
  const { showHiddenThoughts } = store.getState()

  if (contextChain.length > 1 && head(contextChain).length === 1) {
    return
  }
  const derivedCursor = !ignoreChildren && contextChain.length > 1 ? getDerivedCursor(contextChain) : cursor
  const derivedContextRanked = contextOf(derivedCursor)
  // map is expensive than duplicate condition check hence using the former
  const derivedContext = !ignoreChildren && contextChain.length > 1 ? contextOf(derivedCursor).map(c => c.value) : context

  const firstChild = firstChildOfThought(derivedCursor || RANKED_ROOT, showHiddenThoughts)
  if (!ignoreChildren && firstChild) {
    return { nextThoughts: unroot(cursor.concat(firstChild)), contextChain: [] }
  }
  const sortPreference = getSortPreference(meta(pathToContext(derivedContext)))
  const siblings = sortPreference === 'Alphabetical' ? getThoughtsSorted(derivedContext) : getThoughtsRanked(derivedContext)

  const contextHead = ((contextChain).length > 1 && head(contextChain).length < 3) ? head(contextChain)[0].value : head(derivedContext)
  if (siblings.length === 0) {
    return getNextThoughtsWithContextChain(contextHead, contextOf(derivedContext), rank, contextOf(derivedCursor), derivedContextRanked, contextChain.length > 1 ? [contextChain.slice(-1)] : contextChain)
  }

  const nextSibling = thoughtNextSibling(value, derivedContext, rank, showHiddenThoughts)
  if (nextSibling) {
    return { nextThoughts: unroot(derivedContextRanked.concat(nextSibling)), contextChain: contextOf(contextChain) }
  }
  // look for uncle/ancestor sibling
  else {
    const parentThought = derivedCursor.slice(-2, -1)[0]
    const parentContext = context.length === 1 ? [ROOT_TOKEN] : contextOf(derivedContext)
    const contextChainForParentThought = [...contextOf(contextChain), contextOf(head(contextChain))]
    const parentCursor = contextOf(derivedCursor)

    const cursorToFirstThoughtInContext = contextOf(contextChain.length > 1 ? contextChain.flat() : derivedCursor)
    // restricts from working with multilevel context chains
    const rankedContextOfCurrentContext = contextOf(contextChain)[0]
    const contextChainTillFirstChildOfContext = [...contextOf(contextChain), [head(contextChain)[0]]]
    const firstThoughtInContext = head(contextChain)[0]

    // reached last child of last thought
    if (!parentThought) {
      return { nextThoughts: [siblings[0]] || [ROOT_TOKEN], contextChain: [] }
    }
    const thoughtsWithContextChain = thoughtViewLookUp(parentThought.value, parentContext, parentThought.rank, parentCursor, contextChainForParentThought, true)
    return thoughtsWithContextChain || contextViewLookup(firstThoughtInContext.value, rankedContextOfCurrentContext.map(c => c.value), firstThoughtInContext.rank, cursorToFirstThoughtInContext, rankedContextOfCurrentContext, contextChainTillFirstChildOfContext, true)

  }
}

/** Gets nextThoughts and their respective contextChain */
export const getNextThoughtsWithContextChain = (value, context, rank, cursor, contextRanked, contextChain) => {
  const { contextViews } = store.getState()
  if (!contextChain) {
    contextChain = splitChain(cursor, contextViews)
  }

  return contextViewLookup(value, context, rank, cursor, contextRanked, contextChain)
}
