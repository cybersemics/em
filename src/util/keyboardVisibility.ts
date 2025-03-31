import _ from 'lodash'
import { Store } from 'redux'
import State from '../@types/State'
import { editingActionCreator as editingAction } from '../actions/editing'
import { isTouch } from '../browser'
import { KEYBOARD_VISIBILITY_THRESHOLD } from '../constants'
import * as selection from '../device/selection'

interface KeyboardVisibilityState {
  initialViewportHeight: number | null
  lastViewportHeight: number | null
  isKeyboardVisible: boolean
}

interface KeyboardVisibilityTracker {
  initialize: () => void

  reset: () => void

  createTracker: (store: Store<State>) => () => void
}

/**
 * Creates a keyboard tracker with encapsulated keyboardVisibilityState.
 *
 * @returns A keyboard tracker instance.
 */
const createKeyboardVisibilityTracker = (): KeyboardVisibilityTracker => {
  // Private keyboardVisibilityState
  let keyboardVisibilityState: KeyboardVisibilityState = {
    initialViewportHeight: null,
    lastViewportHeight: null,
    isKeyboardVisible: false,
  }

  return {
    initialize: () => {
      if (!window.visualViewport) {
        return
      }

      keyboardVisibilityState = {
        ...keyboardVisibilityState,
        initialViewportHeight: window.visualViewport.height,
        lastViewportHeight: window.visualViewport.height,
      }
    },

    reset: () => {
      keyboardVisibilityState = {
        initialViewportHeight: null,
        lastViewportHeight: null,
        isKeyboardVisible: false,
      }
    },

    createTracker: (store: Store<State>) => {
      return _.throttle(() => {
        // Only apply this for touch devices where the issue occurs
        if (!isTouch || !window.visualViewport) {
          return
        }

        const visualViewport = window.visualViewport

        // If we don't have initial height, set it now
        if (keyboardVisibilityState.initialViewportHeight === null) {
          keyboardVisibilityState = {
            ...keyboardVisibilityState,
            initialViewportHeight: visualViewport.height,
            lastViewportHeight: visualViewport.height,
          }
          return
        }

        const currentHeight = visualViewport.height
        const previousHeight =
          keyboardVisibilityState.lastViewportHeight || keyboardVisibilityState.initialViewportHeight

        // Calculate height change ratio
        const heightChangeRatio = Math.abs(currentHeight - previousHeight) / previousHeight

        // Update last height
        keyboardVisibilityState = {
          ...keyboardVisibilityState,
          lastViewportHeight: currentHeight,
        }

        // check if the change is significant to be considered a keyboard change
        if (heightChangeRatio > KEYBOARD_VISIBILITY_THRESHOLD) {
          // check if height increased significantly (keyboard closed)
          if (currentHeight > previousHeight) {
            if (keyboardVisibilityState.isKeyboardVisible) {
              keyboardVisibilityState = {
                ...keyboardVisibilityState,
                isKeyboardVisible: false,
              }

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
            keyboardVisibilityState = {
              ...keyboardVisibilityState,
              isKeyboardVisible: true,
            }
          }
        }
      }, 100)
    },
  }
}

export default createKeyboardVisibilityTracker
