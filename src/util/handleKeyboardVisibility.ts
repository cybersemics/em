import _ from 'lodash'
import { editingActionCreator as editingAction } from '../actions/editing'
import { isTouch } from '../browser'
import { KEYBOARD_VISIBILITY_THRESHOLD } from '../constants'
import * as selection from '../device/selection'
import store from '../stores/app'

let lastViewportHeight: number | null = window.visualViewport?.height || null

/**
 * Monitors viewport resize events to detect virtual keyboard visibility changes.
 *
 * This is primarily needed for Android devices when a user navigates away using
 * the back button (dismissing the keyboard) or other UI elements, it won't trigger
 * the blur event. In contrast, iOS typically handles this automatically.
 *
 * When a significant viewport height increase is detected (indicating keyboard closing),
 * this utility dispatches an action to exit editing mode, preventing the UI from
 * remaining in an inconsistent state where editing UI controls are visible but the
 * keyboard is closed.
 
 * @returns A throttled function that should be attached to viewport resize events.
 */
const handleKeyboardVisibility = _.throttle(() => {
  // Only apply this for touch devices  where the issue occurs
  if (!isTouch || !window.visualViewport) {
    return
  }

  // If we don't have previous height, set it now
  if (lastViewportHeight === null) {
    lastViewportHeight = window.visualViewport.height
    return
  }

  const currentHeight = window.visualViewport.height

  // Calculate height change ratio (positive when height increases, negative when it decreases)
  const heightChangeRatio = (currentHeight - lastViewportHeight) / lastViewportHeight

  // Check if height increased significantly (keyboard closed)
  if (heightChangeRatio > KEYBOARD_VISIBILITY_THRESHOLD) {
    // Exit editing mode when keyboard is closed
    store.dispatch((dispatch, getState) => {
      const state = getState()
      if (state.editing && state.cursor) {
        selection.clear()
        dispatch(editingAction({ value: false }))
      }
    })
  }
  // Height decrease (keyboard opened) or insignificant change - no action needed

  // Update last height after all calculations
  lastViewportHeight = currentHeight
}, 100)

export default handleKeyboardVisibility
