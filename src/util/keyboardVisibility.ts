import _ from 'lodash'
import { editingActionCreator as editingAction } from '../actions/editing'
import { isTouch } from '../browser'
import { KEYBOARD_VISIBILITY_THRESHOLD } from '../constants'
import * as selection from '../device/selection'
import store from '../stores/app'

let initialViewportHeight: number | null = window.visualViewport?.height || null
let lastViewportHeight: number | null = window.visualViewport?.height || null
let isKeyboardVisible: boolean = false

/**
 * Reset keyboard visibility tracker state.
 */
const reset = (): void => {
  initialViewportHeight = null
  lastViewportHeight = null
  isKeyboardVisible = false
}

/**
 * Handle viewport resize to detect keyboard visibility changes.
 * Returns a throttled function to be used as an event handler.
 */
const handleKeyboardVisibility = _.throttle(() => {
  // Only apply this for touch devices  where the issue occurs
  if (!isTouch || !window.visualViewport) {
    return
  }

  const visualViewport = window.visualViewport

  // If we don't have initial height, set it now
  if (initialViewportHeight === null) {
    initialViewportHeight = visualViewport.height
    lastViewportHeight = visualViewport.height
    return
  }

  const currentHeight = visualViewport.height
  const previousHeight = lastViewportHeight || initialViewportHeight

  // Calculate height change ratio
  const heightChangeRatio = Math.abs(currentHeight - previousHeight) / previousHeight

  // Update last height
  lastViewportHeight = currentHeight

  // check if the change is significant to be considered a keyboard change
  if (heightChangeRatio > KEYBOARD_VISIBILITY_THRESHOLD) {
    // check if height increased significantly (keyboard closed)
    if (currentHeight > previousHeight) {
      if (isKeyboardVisible) {
        isKeyboardVisible = false

        // Exit editing mode when keyboard is closed
        const state = store.getState()
        if (state.editing && state.cursor) {
          selection.clear()
          store.dispatch(editingAction({ value: false }))
        }
      }
    }
    // check if height is decreased significantly (keyboard opened)
    else if (currentHeight < previousHeight) {
      isKeyboardVisible = true
    }
  }
}, 100)

export default {
  reset,
  handleKeyboardVisibility,
}
