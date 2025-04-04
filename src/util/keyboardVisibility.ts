import _ from 'lodash'
import { editingActionCreator as editingAction } from '../actions/editing'
import { isTouch } from '../browser'
import { KEYBOARD_VISIBILITY_THRESHOLD } from '../constants'
import * as selection from '../device/selection'
import store from '../stores/app'

let lastViewportHeight: number | null = window.visualViewport?.height || null

/**
 * Reset keyboard visibility tracker state.
 */
const reset = (): void => {
  lastViewportHeight = null
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

  // If we don't have previous height, set it now
  if (lastViewportHeight === null) {
    lastViewportHeight = visualViewport.height
    return
  }

  const currentHeight = visualViewport.height

  // Calculate height change ratio
  const heightChangeRatio = Math.abs(currentHeight - lastViewportHeight) / lastViewportHeight

  // check if the change is significant to be considered a keyboard change
  if (heightChangeRatio > KEYBOARD_VISIBILITY_THRESHOLD) {
    // check if height increased significantly (keyboard closed)
    if (currentHeight > lastViewportHeight) {
      // Exit editing mode when keyboard is closed
      store.dispatch((dispatch, getState) => {
        const state = getState()
        if (state.editing && state.cursor) {
          selection.clear()
          dispatch(editingAction({ value: false }))
        }
      })
    }
    // Height decreased significantly (keyboard opened) - no action needed
  }

  // Update last height after all calculations
  lastViewportHeight = currentHeight
}, 100)

export default {
  reset,
  handleKeyboardVisibility,
}
