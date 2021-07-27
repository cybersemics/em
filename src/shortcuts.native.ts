/** Defines global keyboard shortcuts and gestures. */

import Emitter from 'emitter20'
import { keyValueBy } from './util/keyValueBy'
import { Direction, GesturePath, Index, Shortcut, State } from './@types'

import { alert, showLatestShortcuts } from './action-creators'
import * as shortcutObject from './shortcuts/index'
import { Store } from 'redux'
import { GESTURE_SEGMENT_HINT_TIMEOUT } from './constants'
import { GestureResponderEvent } from 'react-native'
export const globalShortcuts = Object.values(shortcutObject) as Shortcut[]

export const shortcutEmitter = new Emitter()

let handleGestureSegmentTimeout: number | undefined // eslint-disable-line fp/no-let

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

/** Returns true if the current alert is a gestureHint. */
export const isGestureHint = ({ alert }: State) => alert && alert.alertType === 'gestureHint'

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

    console.log(shortcut, path)

    // display gesture hint
    clearTimeout(handleGestureSegmentTimeout)
    handleGestureSegmentTimeout = setTimeout(
      () => {
        // only show "Invalid gesture" if hint is already being shown
        store.dispatch((dispatch, getState) => {
          dispatch(
            alert(shortcut ? shortcut.label : isGestureHint(getState()) ? '✗ Invalid gesture' : null, {
              alertType: 'gestureHint',
              showCloseLink: false,
            }),
          )
        })
      },
      // if the hint is already being shown, do not wait to change the value
      isGestureHint(state) ? 0 : GESTURE_SEGMENT_HINT_TIMEOUT,
    )
  },

  /** Executes a valid gesture and closes the gesture hint. */
  handleGestureEnd: (gesture: GesturePath | null, e: GestureResponderEvent) => {
    const state = store.getState()
    const { scrollPrioritized } = state

    if (scrollPrioritized) return

    // disable when modal is displayed or a drag is in progress
    if (gesture && !state.showModal && !state.dragInProgress) {
      const shortcut = shortcutGestureIndex[gesture as string]
      if (shortcut) {
        shortcutEmitter.trigger('shortcut', shortcut)
        shortcut.exec(store.dispatch, store.getState, e, { type: 'gesture' })
        if (store.getState().enableLatestShorcutsDiagram) store.dispatch(showLatestShortcuts(shortcut))
      }
    }

    // clear gesture hint
    clearTimeout(handleGestureSegmentTimeout)
    handleGestureSegmentTimeout = undefined // clear the timer to track when it is running for handleGestureSegment

    // needs to be delayed until the next tick otherwise there is a re-render which inadvertantly calls the automatic render focus in the Thought component.
    setTimeout(() => {
      store.dispatch((dispatch, getState) => {
        if (isGestureHint(getState())) {
          dispatch(alert(null))
        }
      })
    })
  },
})

const { shortcutIdIndex, shortcutGestureIndex } = index()

/** Finds a shortcut by its id. */
export const shortcutById = (id: string): Shortcut | null => shortcutIdIndex[id]
