import { store } from '../store.js'
import globals from '../globals.js'

// constants
import {
  ROOT_TOKEN,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER,
} from '../constants.js'

// util
import {
  getThoughts,
  contextOf,
  isContextViewActive,
  lastThoughtsFromContextChain,
  newThought,
  perma,
  headValue,
  headRank,
  splitChain,
  pathToContext,
} from '../util.js'

import {
  tutorialNext,
} from '../action-creators/tutorial.js'

  // newThought command handler that does some pre-processing before handing off to newThought
const exec = (e, { type }) => {
  const { cursor, contextViews, settings: { tutorial, tutorialStep } = {} } = store.getState()

  if (
    // cancel if tutorial has just started
    (tutorial && tutorialStep === TUTORIAL_STEP_START) ||
    // cancel if invalid New Uncle
    ((e.metaKey || e.ctrlKey) && e.altKey && (!cursor || cursor.length <= 1))
  ) return

  let value = '' // eslint-disable-line fp/no-let
  let valueLeft, valueRight, rankRight, thoughtsRankedLeft // eslint-disable-line fp/no-let
  const offset = window.getSelection().focusOffset
  const showContexts = cursor && isContextViewActive(contextOf(cursor), { state: store.getState() })
  const thoughtsRanked = perma(() => lastThoughtsFromContextChain(splitChain(cursor, contextViews)))

  // for normal command with no modifiers, split the thought at the selection
  // do not split at the beginning of a line as the common case is to want to create a new thought after, and shift + Enter is so near
  // do not split with gesture, as Enter is avialable and separate in the context of mobile
  const split = type !== 'gesture' && cursor && !showContexts && !(e.metaKey || e.ctrlKey) && !e.shiftKey && offset > 0 && offset < headValue(cursor).length
  if (split) {

    const thoughts = pathToContext(thoughtsRanked())
    const context = thoughts.length > 1 ? contextOf(thoughts) : [ROOT_TOKEN]

    // split the value into left and right parts
    value = headValue(cursor)
    valueLeft = value.slice(0, offset)
    valueRight = value.slice(offset)
    thoughtsRankedLeft = contextOf(thoughtsRanked()).concat({ value: valueLeft, rank: headRank(cursor) })

    store.dispatch({
      type: 'existingThoughtChange',
      oldValue: value,
      newValue: valueLeft,
      context,
      thoughtsRanked: thoughtsRanked()
    })
  }

  // wait for existing thoughtChange to update state
  // should be done reducer combination
  setTimeout(() => {
    ({ rankRight } = newThought({
      value: !(e.metaKey || e.ctrlKey) && !e.shiftKey ? valueRight : '',
      // new uncle
      at: (e.metaKey || e.ctrlKey) && e.altKey ? contextOf(cursor) :
        split ? thoughtsRankedLeft :
        null,
      // new thought in context
      insertNewSubthought: (e.metaKey || e.ctrlKey) && !e.altKey,
      // new thought above
      insertBefore: e.shiftKey,
      // selection offset
      offset: 0
    }))

    if (split) {

      const thoughtsRankedRight = contextOf(thoughtsRanked()).concat({ value: valueRight, rank: rankRight })
      const children = getThoughts(thoughtsRankedLeft)

      children.forEach(child => {
        store.dispatch({
          type: 'existingThoughtMove',
          oldPath: thoughtsRankedLeft.concat(child),
          newPath: thoughtsRankedRight.concat(child)
        })
      })
    }
  })

  if (cursor && headValue(cursor).length > 0 &&
    (tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_ENTER ||
    tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT_ENTER)) {
    clearTimeout(globals.newSubthoughtModalTimeout)
    tutorialNext()
  }
}

export default {
  id: 'newThought',
  name: 'New Thought',
  description: 'Create a new thought.',
  keyboard: { key: 'Enter' },
  gesture: 'rd',
  exec
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const newThoughtAliases = {
  id: 'newThoughtAliases',
  hideFromInstructions: true,
  gesture: ['rdld', 'rdldl', 'rdldld', 'rld', 'rldl', 'rldld', 'rldldl'],
  exec
}
