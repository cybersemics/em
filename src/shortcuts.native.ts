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
 * Keyboard and gesture handlers factory function that binds the store to event handlers.
 *
 * There are two alert types for gesture hints:
 * - gestureHint - The basic gesture hint that is shown immediately on swipe.
 * - gestureHintExtended - The extended gesture hint that shows all possible gestures from the current sequence after a delay.
 *
 * There is no automated test coverage since timers are so messed up in the current Jest version. It may be possible to write tests if Jest is upgraded. Manual test cases.
 * - Basic gesture hint.
 * - Preserve gesture hint for valid shortcut.
 * - Only show "Cancel gesture" if gesture hint is already activated.
 * - Dismiss gesture hint after release for invalid shortcut.
 * - Extended gesture hint on hold.
 * - Extended gesture hint from invalid gesture (e.g. ←↓, hold, ←↓←).
 * - Change extended gesture hint to basic gesture hint on gesture end.
 */
export const inputHandlers = (store: Store<State, any>) => ({
  /** Handles gesture hints when a valid segment is entered. */
  handleGestureSegment: ({ gesture, sequence }: { gesture: Direction | null; sequence: GesturePath }) => {
    const state = store.getState()
    const { toolbarOverlay, scrollPrioritized } = state

    if (toolbarOverlay || scrollPrioritized || state.showModal || state.dragInProgress) return

    const shortcut = shortcutGestureIndex[sequence as string]

    // basic gesture hint
    if (
      // only show basic gesture hint if the extended gesture hint is not already being shown
      state.alert?.alertType !== 'gestureHintExtended' &&
      // ignore back
      shortcut?.id !== 'cursorBack' &&
      // ignore forward
      shortcut?.id !== 'cursorForward' &&
      // only show
      (shortcut || state.alert?.alertType === 'gestureHint')
    ) {
      store.dispatch(
        // alert the shortcut label if it is a valid gesture
        // alert "Cancel gesture" if it is not a valid gesture (basic gesture hint)
        alert(shortcut ? shortcut?.label : '✗ Cancel gesture', {
          alertType: 'gestureHint',
          showCloseLink: !!shortcut,
        }),
      )
    }

    // extended gesture hint
    // alert after a delay of GESTURE_HINT_EXTENDED_TIMEOUT
    clearTimeout(gestureHintExtendedTimeout)
    gestureHintExtendedTimeout = window.setTimeout(
      () => {
        store.dispatch((dispatch, getState) => {
          // do not show "Cancel gesture" if already being shown by basic gesture hint
          if (getState().alert?.value === '✗ Cancel gesture') return
          dispatch(
            alert(sequence as string, {
              alertType: 'gestureHintExtended',
              // no need to show close link on "Cancel gesture" since it is dismiss automatically
              showCloseLink: !!shortcut,
            }),
          )
        })
      },
      // if the hint is already being shown, do not wait to change the value
      state.alert?.alertType === 'gestureHintExtended' ? 0 : GESTURE_HINT_EXTENDED_TIMEOUT,
    )
  },

  handleGestureEnd: ({ sequence, e }: { sequence: GesturePath | null; e: GestureResponderEvent }) => {
    const state = store.getState()
    const { scrollPrioritized } = state

    if (scrollPrioritized) return

    const shortcut = shortcutGestureIndex[sequence as string]

    // disable when modal is displayed or a drag is in progress
    if (shortcut && !state.showModal && !state.dragInProgress) {
      shortcutEmitter.trigger('shortcut', shortcut)
      shortcut.exec(store.dispatch, store.getState, e, { type: 'gesture' })
      if (store.getState().enableLatestShorcutsDiagram) store.dispatch(showLatestShortcuts(shortcut))
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
