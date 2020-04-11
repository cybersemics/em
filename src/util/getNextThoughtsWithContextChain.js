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
  hashThought,
  splitChain,
  nextSibling as thoughtNextSibling
} from '../util.js'
import { isContextViewActive } from './isContextViewActive.js'

const contextToThought = (context, thoughtIndex) => context.map(contextValue => {
  const thought = thoughtIndex[hashThought(contextValue)]
  return { value: thought.value, rank: thought.contexts[0] ? thought.contexts[0].rank : 0 }
})

const mapContextsToThoughts = (contexts, thoughtIndex) => contexts.map(({ context }) => contextToThought(context, thoughtIndex))

const getContextSiblings = (context, thoughtIndex) => {
  const contexts = getContextsSortedAndRanked(head(context))
  return mapContextsToThoughts(contexts, thoughtIndex)
}

const nextSiblingContext = (value, context, thoughtIndex) => {
  const contextSiblings = getContextSiblings(context, thoughtIndex)
  const currentIndex = contextSiblings.findIndex(thoughts => thoughts.find(thought => thought.value === value))
  return contextSiblings[currentIndex + 1]
}

const firstChildOfContext = (value, cursor, thoughtIndex) => {
  const context = pathToContext(cursor)
  return nextSiblingContext(value, context, thoughtIndex)
}

const firstChildOfThought = (thoughtsRanked, showHiddenThoughts) => {
  const contextMeta = meta(thoughtsRanked)
  const sortPreference = getSortPreference(contextMeta)
  const children = (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(thoughtsRanked)
  const notHidden = child => !isFunction(child.value) && !meta(pathToContext(thoughtsRanked).concat(child.value)).hidden
  const childrenFiltered = showHiddenThoughts ? children : children.filter(notHidden)
  return childrenFiltered[0]
}

/** Gets nextThoughts and their respective contextChain */
export const getNextThoughtsWithContextChain = (value, context, rank, cursor, contextRanked, contextChain) => {
  const { showHiddenThoughts, thoughtIndex, contextViews } = store.getState()
  if (!contextChain) {
    contextChain = splitChain(cursor, contextViews)
  }

  if (context.length === 0 || cursor.length === 0) {
    return null
  }

  // if the cursor is at a thought with context view open, move it into context view - jump in
  if (isContextViewActive(pathToContext(cursor))) {
    const withinContextView = isContextViewActive(contextRanked)
    const thoughtsRanked = withinContextView ? getContextSiblings(context, thoughtIndex) : getThoughtsRanked(context)

    const currentThought = withinContextView ? thoughtsRanked.find(thoughts => thoughts.find(thought => thought.value === value))[0] : thoughtsRanked.find(thought => thought.value === value && thought.rank === rank)
    const firstChild = firstChildOfContext(value, cursor, thoughtIndex)
    if (firstChild) {
      return { nextThoughts: [...firstChild, currentThought], contextChain }
    }
    // jump out if there are no context children
    return getNextThoughtsWithContextChain(value, context, rank, cursor, contextOf(contextRanked), contextOf(contextChain))
  }
  // if cursor is within a context view, return the next context
  else if (isContextViewActive(contextRanked)) {
    const nextSibling = nextSiblingContext(value, context, thoughtIndex, showHiddenThoughts)
    const contextRankedHead = head(contextRanked)

    if (nextSibling) {
      return { nextThoughts: [...nextSibling, contextRankedHead], contextChain: contextOf(contextChain) }
    }
    // jump out
    return getNextThoughtsWithContextChain(contextRankedHead.value, contextOf(context), contextRankedHead.rank, cursor, contextOf(contextRanked), contextOf(contextChain))
  }

  const thoughtsRanked = cursor || RANKED_ROOT
  const firstChild = firstChildOfThought(thoughtsRanked, showHiddenThoughts)
  if (firstChild) {
    return { nextThoughts: unroot(thoughtsRanked.concat(firstChild)), contextChain: [] }
  }

  const nextSibling = thoughtNextSibling(value, context, rank, showHiddenThoughts)
  const sortPreference = getSortPreference(meta(pathToContext(context)))
  const siblings = sortPreference === 'Alphabetical' ? getThoughtsSorted(context) : getThoughtsRanked(context)

  const contextHead = head(context)
  if (siblings.length === 0) {
    return getNextThoughtsWithContextChain(contextHead, contextOf(context), rank, cursor, contextRanked, contextChain)
  }

  if (!nextSibling) {
    const parentContext = context.length === 1 ? [ROOT_TOKEN] : contextOf(context)
    return getNextThoughtsWithContextChain(contextHead, parentContext, head(contextRanked).rank, cursor, contextOf(contextRanked), contextChain)
  }
  return { nextThoughts: unroot(contextRanked.concat(nextSibling)), contextChain: [] }
}
