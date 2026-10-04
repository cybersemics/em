import { Capacitor, PluginListenerHandle } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { cancelFrame, frame } from 'framer-motion'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { LongPressState } from '../../../constants'
import store from '../../../stores/app'
import viewportStore from '../../../stores/viewportStore'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import getSafeAreaBottom from '../getSafeAreaBottom'

// Calibrated from UIKit on iOS 26.5: mass 1, stiffness 555.0265, damping 47.118,
// initial velocity 0, linear time, and a 383.3 ms settling duration. This is a critically damped spring.
const KEYBOARD_SPRING_FREQUENCY = Math.sqrt(555.0265)
const KEYBOARD_ANIMATION_DURATION = 383.3

/** Releases resources owned by the currently initialized handler. */
let dispose = () => {}

/** Tracks scalar iOS keyboard geometry using Capacitor's standard lifecycle events and the calibrated curve. */
const iOSCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    dispose()
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    let disposed = false
    let safeAreaBottom = getSafeAreaBottom()
    let rawHeight =
      virtualKeyboardStore.getState().height > 0 ? virtualKeyboardStore.getState().height + safeAreaBottom : 0
    let targetHeight: number | null = null
    let transition: { from: number; to: number; startedAt: number } | null = null
    const handles: PluginListenerHandle[] = []

    /** Publishes geometry above the resting safe-area baseline. */
    const publish = (open: boolean) => {
      virtualKeyboardStore.update({ height: Math.max(0, rawHeight - safeAreaBottom), open })
    }

    /** Samples the fixed spring before Motion renders its scalar consumers. */
    const tick = () => {
      if (disposed || !transition) return
      const elapsed = Math.max(0, performance.now() - transition.startedAt)
      const finished = elapsed >= KEYBOARD_ANIMATION_DURATION
      const time = elapsed / 1000
      const progress = finished
        ? 1
        : 1 - Math.exp(-KEYBOARD_SPRING_FREQUENCY * time) * (1 + KEYBOARD_SPRING_FREQUENCY * time)
      rawHeight = transition.from + progress * (transition.to - transition.from)
      publish(!finished || transition.to > 0)
      if (finished) transition = null
      else frame.update(tick)
    }

    /** Starts from the currently sampled height; duplicate notifications do not restart the clock. */
    const start = (height: number) => {
      if (disposed) return
      safeAreaBottom = getSafeAreaBottom()
      if (height > 0) viewportStore.update({ virtualKeyboardHeight: Math.max(0, height - safeAreaBottom) })
      if (targetHeight === height && transition) return
      cancelFrame(tick)
      targetHeight = height
      if (rawHeight === height) {
        transition = null
        publish(height > 0)
        return
      }
      // Standard Capacitor events carry no native start timestamp; sampling begins at event receipt.
      transition = { from: rawHeight, to: height, startedAt: performance.now() }
      tick()
    }

    /** Reconciles completion, including transitions that finish before the calibrated duration. */
    const settle = (height: number) => {
      if (disposed) return
      cancelFrame(tick)
      transition = null
      targetHeight = rawHeight = height
      safeAreaBottom = getSafeAreaBottom()
      if (height > 0) viewportStore.update({ virtualKeyboardHeight: Math.max(0, height - safeAreaBottom) })
      publish(height > 0)
    }

    /** Owns listener cleanup, including registration that resolves after teardown. */
    const listen = (registration: Promise<PluginListenerHandle>) => {
      void registration.then(handle => {
        if (disposed) void handle.remove()
        else handles.push(handle)
      })
    }

    listen(
      Keyboard.addListener('keyboardWillShow', info => {
        // Preserve the existing guard against transient keyboard focus during a long-press drag.
        if (store.getState().longPress === LongPressState.Inactive) start(info.keyboardHeight)
      }),
    )
    listen(Keyboard.addListener('keyboardWillHide', () => start(0)))
    listen(
      Keyboard.addListener('keyboardDidShow', info => {
        if (targetHeight === 0 || store.getState().longPress !== LongPressState.Inactive) return
        settle(info.keyboardHeight)
      }),
    )
    listen(
      Keyboard.addListener('keyboardDidHide', () => {
        if (targetHeight !== null && targetHeight > 0) return
        settle(0)
      }),
    )

    dispose = () => {
      if (disposed) return
      disposed = true
      cancelFrame(tick)
      transition = null
      handles.forEach(handle => void handle.remove())
    }
  },
  destroy: () => dispose(),
  show: editable => {
    // WKWebView usually focuses the editing host when the browser selection is set, but not once the keyboard
    // has been dismissed programmatically, e.g. by the selection.clear() that runs when undo removes the cursor
    // thought. The selection is then applied without focus and is wiped again as soon as the hidden asyncFocus
    // input blurs, leaving the new thought with no caret and no keyboard (#4869). A script-initiated focus
    // restores both. Keyboard.show() is not an option: the Capacitor plugin only implements it on Android.
    editable.focus()
  },
}

export default iOSCapacitorHandler
