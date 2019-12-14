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
  asyncFocus,
  getChildrenWithRank,
  contextOf,
  isContextViewActive,
  lastItemsFromContextChain,
  newItem,
  perma,
  headKey,
  headRank,
  splitChain,
  unrank,
} from '../util.js'

import {
  tutorialNext,
} from '../action-creators/tutorial.js'

  // newThought command handler that does some pre-processing before handing off to newItem
const exec = (e, { type }) => {
  const { cursor, contextViews, settings: { tutorialStep } = {} } = store.getState()

  if (
    // cancel if tutorial has just started
    tutorialStep === TUTORIAL_STEP_START ||
    // cancel if invalid New Uncle
    ((e.metaKey || e.ctrlKey) && e.altKey && (!cursor || cursor.length <= 1))
  ) return

  let key = '' // eslint-disable-line fp/no-let
  let keyLeft, keyRight, rankRight, itemsRankedLeft // eslint-disable-line fp/no-let
  const offset = window.getSelection().focusOffset
  const showContexts = cursor && isContextViewActive(unrank(contextOf(cursor)), { state: store.getState() })
  const itemsRanked = perma(() => lastItemsFromContextChain(splitChain(cursor, contextViews)))

  // for normal command with no modifiers, split the thought at the selection
  // do not split at the beginning of a line as the common case is to want to create a new thought after, and shift + Enter is so near
  // do not split with gesture, as Enter is avialable and separate in the context of mobile
  const split = type !== 'gesture' && cursor && !showContexts && !(e.metaKey || e.ctrlKey) && !e.shiftKey && offset > 0 && offset < headKey(cursor).length
  if (split) {

    const items = unrank(itemsRanked())
    const context = items.length > 1 ? contextOf(items) : [ROOT_TOKEN]

    // split the key into left and right parts
    key = headKey(cursor)
    keyLeft = key.slice(0, offset)
    keyRight = key.slice(offset)
    itemsRankedLeft = contextOf(itemsRanked()).concat({ key: keyLeft, rank: headRank(cursor) })

    store.dispatch({
      type: 'existingItemChange',
      oldValue: key,
      newValue: keyLeft,
      context,
      itemsRanked: itemsRanked()
    })
  }

  // wait for existing itemChange to update state
  // should be done reducer combination
  asyncFocus.enable()
  setTimeout(() => {
    ({ rankRight } = newItem({
      value: !(e.metaKey || e.ctrlKey) && !e.shiftKey ? keyRight : '',
      // new uncle
      at: (e.metaKey || e.ctrlKey) && e.altKey ? contextOf(cursor) :
        split ? itemsRankedLeft :
        null,
      // new item in context
      insertNewChild: (e.metaKey || e.ctrlKey) && !e.altKey,
      // new item above
      insertBefore: e.shiftKey,
      // selection offset
      offset: 0
    }))

    if (split) {

      const itemsRankedRight = contextOf(itemsRanked()).concat({ key: keyRight, rank: rankRight })
      const children = getChildrenWithRank(itemsRankedLeft)

      children.forEach(child => {
        store.dispatch({
          type: 'existingItemMove',
          oldItemsRanked: itemsRankedLeft.concat(child),
          newItemsRanked: itemsRankedRight.concat(child)
        })
      })
    }
  })

  if (cursor && headKey(cursor).length > 0 &&
    (tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_ENTER ||
    tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT_ENTER)) {
    clearTimeout(globals.newChildHelperTimeout)
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
