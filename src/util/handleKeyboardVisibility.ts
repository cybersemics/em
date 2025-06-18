import _ from 'lodash'
import { keyboardOpenActionCreator } from '../actions/keyboardOpen'
import { isTouch } from '../browser'
import { KEYBOARD_VISIBILITY_THRESHOLD } from '../constants'
import * as selection from '../device/selection'
import store from '../stores/app'

let lastViewportHeight: number | null = window.visualViewport?.height || null
let lastViewportWidth: number | null = window.visualViewport?.width || null

/**
 * Monitors viewport resize events to detect virtual keyboard visibility changes.
 *
 * This is primarily needed for Android devices when a user navigates away using
 * the back button (dismissing the keyboard) or other UI elements, it won't trigger
 * the blur event. In contrast, iOS typically handles this automatically.
 *
 * When a significant viewport height increase is detected (indicating keyboard closing),
 * and the width hasn't decreased significantly (not a rotation), this utility dispatches 
 * an action to exit editing mode, preventing the UI from remaining in an inconsistent 
 * state where editing UI controls are visible but the keyboard is closed.
 
 * @returns A throttled function that should be attached to viewport resize events.
 */
const handleKeyboardVisibility = _.throttle(() => {
  // Only apply this for touch devices  where the issue occurs
  if (!isTouch || !window.visualViewport) {
    return
  }

  const currentHeight = window.visualViewport.height
  const currentWidth = window.visualViewport.width

  // If we don't have previous dimensions, set them now
  if (lastViewportHeight === null || lastViewportWidth === null) {
    lastViewportHeight = currentHeight
    lastViewportWidth = currentWidth
    return
  }

  // Calculate height and width change ratios
  const heightChangeRatio = (currentHeight - lastViewportHeight) / lastViewportHeight

  // Check if height increased significantly (keyboard closed)
  // AND width didn't change (not a rotation)
  if (heightChangeRatio > KEYBOARD_VISIBILITY_THRESHOLD && currentWidth === lastViewportWidth) {
    // Exit editing mode when keyboard is closed
    store.dispatch((dispatch, getState) => {
      const state = getState()
      if (state.isKeyboardOpen && state.cursor) {
        selection.clear()
        dispatch(keyboardOpenActionCreator({ value: false }))
      }
    })
  }
  // Height decrease, insignificant change, or device rotation - no action needed

  // Update last dimensions after all calculations
  lastViewportHeight = currentHeight
  lastViewportWidth = currentWidth
}, 100)

export default handleKeyboardVisibility
