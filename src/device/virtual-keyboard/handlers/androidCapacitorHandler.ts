import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { dismissKeyboardActionCreator as dismissKeyboard } from '../../../actions/dismissKeyboard'
import store from '../../../stores/app'
import viewportStore from '../../../stores/viewport'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import * as selection from '../../selection'
import VirtualKeyboardTracker from '../VirtualKeyboardTracker'
import getSafeAreaBottom from '../getSafeAreaBottom'

/** Returns true when this Android build includes the native per-frame IME tracker. */
const hasTracker = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('VirtualKeyboardTracker')

// WebView can present a CSS update one frame after the native IME surface has moved.
const WEBVIEW_PAINT_LEAD_MS = 16

/** The Android 11+ tracker owns keyboard lifecycle because its decor-view animation callback supersedes
 * Capacitor Keyboard's callback. Older Android versions retain the Capacitor hide-event behavior. */
const androidCapacitorHandler: VirtualKeyboardHandler & { prepareBlurredHide: () => void } = {
  init: () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    if (!hasTracker()) {
      Keyboard.addListener('keyboardWillHide', () => selection.collapse())
      Keyboard.addListener('keyboardDidHide', () => store.dispatch(dismissKeyboard()))
      return
    }

    document.documentElement.style.setProperty('--virtual-keyboard-height', '0px')
    let blurredHide = false
    let previousProgressTime: number | null = null
    let previousHeight = 0
    VirtualKeyboardTracker.addListener(
      'keyboardProgress',
      ({ phase, height, shownHeight, timestampMs, navigationInset }) => {
        if (phase === 'willShow' || phase === 'didHide') {
          blurredHide = false
        } else if (phase === 'willHide') {
          const active = document.activeElement
          blurredHide = !(
            active instanceof HTMLInputElement ||
            active instanceof HTMLTextAreaElement ||
            active?.hasAttribute('contenteditable')
          )
        }

        if (phase === 'willShow' || phase === 'willHide') previousProgressTime = null
        const elapsed = previousProgressTime == null || timestampMs == null ? 0 : timestampMs - previousProgressTime
        const velocity = phase === 'progress' && elapsed > 0 ? (height - previousHeight) / elapsed : 0
        const projectedHeight =
          phase === 'progress'
            ? Math.min(shownHeight || height, Math.max(0, height + velocity * WEBVIEW_PAINT_LEAD_MS))
            : height
        previousProgressTime = timestampMs ?? null
        previousHeight = height

        // The CSS variable bypasses a React render on every native animation frame. The inset already
        // includes navigation. When the editable blurs before hide, Android's visible IME surface rises
        // by another navigation inset even though the reported IME inset does not. Project one WebView
        // paint frame ahead from the system's measured heights so controls stay with the native surface.
        document.documentElement.style.setProperty(
          '--virtual-keyboard-height',
          `${projectedHeight + (blurredHide ? (navigationInset ?? 0) : 0)}px`,
        )

        if (phase === 'willShow') {
          virtualKeyboardStore.update({ open: true })
        } else if (phase === 'didShow') {
          viewportStore.update({ virtualKeyboardHeight: height })
          virtualKeyboardStore.update({ open: true, height })
        } else if (phase === 'willHide') {
          selection.collapse()
        } else if (phase === 'didHide') {
          viewportStore.update({ virtualKeyboardHeight: 0 })
          virtualKeyboardStore.update({ open: false, height: 0 })
          store.dispatch(dismissKeyboard())
        }
      },
    )
  },
  destroy: () => {
    Keyboard.removeAllListeners()
    if (hasTracker()) {
      VirtualKeyboardTracker.removeAllListeners()
      document.documentElement.style.removeProperty('--virtual-keyboard-height')
    }
  },
  show: () => {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Keyboard')) Keyboard.show()
  },
  prepareBlurredHide: () => {
    if (!hasTracker() || !virtualKeyboardStore.getState().open) return
    const active = document.activeElement
    if (
      !(active instanceof HTMLInputElement) &&
      !(active instanceof HTMLTextAreaElement) &&
      !active?.hasAttribute('contenteditable')
    )
      return

    const root = document.documentElement
    const height = parseFloat(root.style.getPropertyValue('--virtual-keyboard-height')) || 0
    root.style.setProperty('--virtual-keyboard-height', `${height + getSafeAreaBottom()}px`)
  },
}

export default androidCapacitorHandler
