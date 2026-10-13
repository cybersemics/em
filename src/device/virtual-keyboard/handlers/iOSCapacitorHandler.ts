import { Capacitor, PluginListenerHandle } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { AnimationPlaybackControls, animate } from 'framer-motion'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { LongPressState } from '../../../constants'
import store from '../../../stores/app'
import viewportStore from '../../../stores/viewportStore'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import debugLog from '../../../util/debugLog'
import getSafeAreaBottom from '../getSafeAreaBottom'

/** Lets edit mode lead the native show callback without moving the bar before the keyboard starts. */
const EDIT_MODE_SHOW_DELAY = 80

/** Uses standard Capacitor events and TypeScript timing without runtime native calibration. */
const initKeyboard = () => {
  let disposed = false
  const handles: PluginListenerHandle[] = []
  let showTimer: ReturnType<typeof setTimeout> | null = null

  /** Provides control over the spring animation. */
  let controls: AnimationPlaybackControls | null = null
  let targetHeight: number | null = null
  let measuredHeight: number | null = null
  let wasEditing = store.getState().isKeyboardOpen

  /** Animates the shared keyboard height, including the final closed state. */
  const animateHeight = (height: number) => {
    if (height === targetHeight) return
    targetHeight = height
    controls?.stop()
    virtualKeyboardStore.update({ open: true })

    if (height === 0 && virtualKeyboardStore.getState().height === 0) {
      virtualKeyboardStore.update({ open: false })
      targetHeight = null
      return
    }

    controls = animate(virtualKeyboardStore.getState().height, height, {
      type: 'spring',
      stiffness: height === 0 ? 12000 : 3600,
      damping: 220,
      mass: 1.2,
      onUpdate: value => {
        virtualKeyboardStore.update({ height: value })
      },
      onComplete: () => {
        if (height === 0) {
          virtualKeyboardStore.update({ open: false, height: 0 })
          targetHeight = null
        }
      },
    })
  }

  /** Starts from edit mode while the native callback is still crossing into the web view. */
  const onEditModeChange = () => {
    const editing = store.getState().isKeyboardOpen
    if (editing === wasEditing) return
    wasEditing = editing

    if (showTimer !== null) clearTimeout(showTimer)
    showTimer = null

    if (editing) {
      if (store.getState().longPress !== LongPressState.Inactive) return
      showTimer = setTimeout(() => {
        showTimer = null
        if (!store.getState().isKeyboardOpen || (targetHeight !== 0 && virtualKeyboardStore.getState().open)) return
        // Before the first native event viewportStore contains a raw estimate. Afterwards it holds
        // the normalized height from keyboardWillShow, so do not subtract the safe area twice.
        animateHeight(
          measuredHeight ?? Math.max(0, viewportStore.getState().virtualKeyboardHeight - getSafeAreaBottom()),
        )
      }, EDIT_MODE_SHOW_DELAY)
    } else if (virtualKeyboardStore.getState().open) {
      animateHeight(0)
    }
  }

  const unsubscribeEditMode = store.subscribe(onEditModeChange)

  /** Removes pending registrations even if the handler is destroyed before they resolve. */
  const listen = (registration: Promise<PluginListenerHandle>) => {
    void registration.then(handle => {
      if (disposed) void handle.remove()
      else handles.push(handle)
    })
  }

  listen(
    Keyboard.addListener('keyboardWillShow', info => {
      if (disposed) return
      // Ignore the transient keyboard show that iOS fires from the unpreventable long-press onFocus during a
      // drag (#4683). We dismiss the keyboard immediately when a drag begins, but reacting to this show would
      // animate the virtual keyboard height up and then straight back down, making the drag-and-drop alert
      // jump. Skip the layout update while a drag gesture is active; the keyboard should never be open then.
      const ignored = store.getState().longPress !== LongPressState.Inactive

      // Get the raw height of the keyboard from the event...
      const rawHeight = info.keyboardHeight || 0

      // Record the keyboard as iOS reports it, beside the keyboardOpen actions that set Redux's isKeyboardOpen, so an
      // edit mode that disagrees with the keyboard on screen shows which side moved. Includes the ignored shows.
      debugLog.log('keyboard', { event: 'willShow', rawHeight, ignored })
      if (ignored) return

      // ...then subtract the safe-area-bottom inset to get the height above the safe-area baseline.
      // Because we always add a safe-area-bottom inset whenever we position elements, this normalized height
      // is the value we actually need. Consider this an additional 'safe area inset' that applies only when the keyboard is open.
      const targetHeight = rawHeight - getSafeAreaBottom()
      measuredHeight = targetHeight
      viewportStore.update({ virtualKeyboardHeight: targetHeight })
      if (showTimer !== null) clearTimeout(showTimer)
      showTimer = null
      animateHeight(targetHeight)
    }),
  )

  listen(
    Keyboard.addListener('keyboardWillHide', () => {
      if (disposed) return
      debugLog.log('keyboard', { event: 'willHide' })
      if (showTimer !== null) clearTimeout(showTimer)
      showTimer = null
      animateHeight(0)
    }),
  )

  return () => {
    if (disposed) return
    disposed = true
    unsubscribeEditMode()
    controls?.stop()
    if (showTimer !== null) clearTimeout(showTimer)
    handles.forEach(handle => void handle.remove())
  }
}

/** Releases resources owned by the currently initialized platform handler. */
let dispose = () => {}

/** Tracks iOS keyboard animation timing and normalized height through the shared keyboard store. */
const iOSCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    dispose()
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return
    dispose = initKeyboard()
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
