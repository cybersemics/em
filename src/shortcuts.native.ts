/** Defines global keyboard shortcuts and gestures. */
import Emitter from 'emitter20'
import { GestureResponderEvent } from 'react-native'
import { Store } from 'redux'
import Direction from './@types/Direction'
import GesturePath from './@types/GesturePath'
import Index from './@types/IndexType'
import Shortcut from './@types/Shortcut'
import State from './@types/State'
import alert from './action-creators/alert'
import showLatestShortcuts from './action-creators/showLatestShortcuts'
import { GESTURE_HINT_EXTENDED_TIMEOUT } from './constants'
import * as shortcutObject from './shortcuts/index'
import keyValueBy from './util/keyValueBy'

export const globalShortcuts = Object.values(shortcutObject) as Shortcut[]

export const shortcutEmitter = new Emitter()

let gestureHintExtendedTimeout: number | undefined // eslint-disable-line fp/no-let

/** Initializes shortcut indices and stores conflicts. */
const index = (): {
  shortcutIdIndex: Index<Shortcut>
  shortcutGestureIndex: Index<Shortcut>
} => {
  // index shortcuts for O(1) lookup by id
  const shortcutIdIndex: Index<Shortcut> = keyValueBy(globalShortcuts, shortcut =>
    shortcut.id ? { [shortcut.id]: shortcut } : null,
  )

  // index shortcuts for O(1) lookup by gesture
  const shortcutGestureIndex: Index<Shortcut> = keyValueBy(globalShortcuts, shortcut =>
    shortcut.gesture
      ? {
          // shortcut.gesture may be a string or array of strings
          // normalize intro array of strings
          ...keyValueBy(Array.prototype.concat([], shortcut.gesture), gesture => ({
            [gesture]: shortcut,
          })),
        }
      : null,
  )

  return { shortcutIdIndex, shortcutGestureIndex }
}

/**
 * Keyboard handlers factory function.
 */
export const inputHandlers = (store: Store<State, any>) => ({
  /** Handles gesture hints when a valid segment is entered. */
  handleGestureSegment: (g: Direction | null, path: GesturePath) => {
    const state = store.getState()
    const { toolbarOverlay, scrollPrioritized } = state

    if (toolbarOverlay || scrollPrioritized) return

    // disable when modal is displayed or a drag is in progress
    if (state.showModal || state.dragInProgress) return

    const shortcut = shortcutGestureIndex[path as string]

    // display gesture hint
    clearTimeout(gestureHintExtendedTimeout)
    gestureHintExtendedTimeout = undefined // clear the timer to track when it is running for handleGestureSegment

    // alert the basic gesture hint (if the extended gesture hint is not already being shown)
    // ignore back and forward nav gestures
    if (
      state.alert?.alertType !== 'gestureHintExtended' &&
      shortcut?.id !== 'cursorBack' &&
      shortcut?.id !== 'cursorForward'
    ) {
      store.dispatch(
        // alert the shortcut label if it is a valid gesture
        // alert "Cancel gesture" if it is not a valid gesture (basic gesture hint)
        alert(shortcut ? shortcut?.label : '✗ Cancel gesture', {
          alertType: 'gestureHint',
        }),
      )
    }

    setTimeout(
      () => {
        // only show "Cancel gesture" if hint is already being shown
        store.dispatch((dispatch, getState) => {
          dispatch(
            alert(
              shortcut
                ? shortcut.label
                : getState().alert?.alertType === 'gestureHintExtended'
                ? '✗ Cancel gesture'
                : null,
              {
                alertType: 'gestureHintExtended',
                showCloseLink: false,
              },
            ),
          )
        })
      },
      // if the hint is already being shown, do not wait to change the value
      state.alert?.alertType === 'gestureHintExtended' ? 0 : GESTURE_HINT_EXTENDED_TIMEOUT,
    )
  },

  /** Executes a valid gesture and closes the gesture hint. */
  handleGestureEnd: (gesture: GesturePath | null, e: GestureResponderEvent) => {
    const state = store.getState()
    const { scrollPrioritized } = state

    if (scrollPrioritized) return

    const shortcut = shortcutGestureIndex[gesture as string]

    // disable when modal is displayed or a drag is in progress
    if (gesture && !state.showModal && !state.dragInProgress) {
      if (shortcut) {
        shortcutEmitter.trigger('shortcut', shortcut)
        shortcut.exec(store.dispatch, store.getState, e, { type: 'gesture' })
        if (store.getState().enableLatestShorcutsDiagram) store.dispatch(showLatestShortcuts(shortcut))
      }
    }

    // clear gesture hint
    clearTimeout(gestureHintExtendedTimeout)
    gestureHintExtendedTimeout = undefined // clear the timer to track when it is running for handleGestureSegment

    // dismiss gesture hint on gesture end
    // needs to be delayed until the next tick otherwise there is a re-render which inadvertantly calls the automatic render focus in the Thought component.
    setTimeout(() => {
      store.dispatch((dispatch, getState) => {
        if (getState().alert?.alertType?.startsWith('gestureHint')) {
          // TODO: Add a setting to auto dismiss alerts after the gesture ends
          dispatch(
            alert(
              shortcut && shortcut.label !== 'cursorForward' && shortcut.label !== 'cursorBack' ? shortcut.label : null,
            ),
          )
        }
      })
    })
  },
})

const { shortcutIdIndex, shortcutGestureIndex } = index()

/** Finds a shortcut by its id. */
export const shortcutById = (id: string): Shortcut | null => shortcutIdIndex[id]
