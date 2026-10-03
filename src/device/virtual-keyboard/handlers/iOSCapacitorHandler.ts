import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { AnimationPlaybackControls, animate, cubicBezier } from 'framer-motion'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { LongPressState } from '../../../constants'
import store from '../../../stores/app'
import viewportStore from '../../../stores/viewportStore'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import getSafeAreaBottom from '../getSafeAreaBottom'

/** Lets edit mode lead the native show callback without moving the bar before the keyboard starts. */
const EDIT_MODE_SHOW_DELAY = 80

/** Preserves keyboard tracking for app binaries built before the native timing plugin was added. */
const initFallback = () => {
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

  Keyboard.addListener('keyboardWillShow', info => {
    // Ignore the transient keyboard show that iOS fires from the unpreventable long-press onFocus during a
    // drag (#4683). We dismiss the keyboard immediately when a drag begins, but reacting to this show would
    // animate the virtual keyboard height up and then straight back down, making the drag-and-drop alert
    // jump. Skip the layout update while a drag gesture is active; the keyboard should never be open then.
    if (store.getState().longPress !== LongPressState.Inactive) return

    // Get the raw height of the keyboard from the event...
    const rawHeight = info.keyboardHeight || 0

    // ...then subtract the safe-area-bottom inset to get the height above the safe-area baseline.
    // Because we always add a safe-area-bottom inset whenever we position elements, this normalized height
    // is the value we actually need. Consider this an additional 'safe area inset' that applies only when the keyboard is open.
    const targetHeight = rawHeight - getSafeAreaBottom()
    measuredHeight = targetHeight
    viewportStore.update({ virtualKeyboardHeight: targetHeight })
    if (showTimer !== null) clearTimeout(showTimer)
    showTimer = null
    animateHeight(targetHeight)
  })

  Keyboard.addListener('keyboardWillHide', () => {
    if (showTimer !== null) clearTimeout(showTimer)
    showTimer = null
    animateHeight(0)
  })

  return () => {
    unsubscribeEditMode()
    controls?.stop()
    if (showTimer !== null) clearTimeout(showTimer)
    void Keyboard.removeAllListeners()
  }
}

interface KeyboardAnimation {
  stage: 'start' | 'end'
  id: number
  fromHeight?: number
  toHeight: number
  startedAt?: number
  visible?: boolean
  speed?: number
  durationMs?: number
  bezier?: [number, number, number, number]
  spring?: { mass: number; stiffness: number; damping: number; velocity: number }
}

/** The native plugin supplies one timing description and the measured endpoint per keyboard transition. */
const IOSKeyboardPlugin = registerPlugin<{
  addListener: (
    name: 'keyboardAnimation',
    listener: (event: KeyboardAnimation) => void,
  ) => Promise<PluginListenerHandle>
  getState: () => Promise<{ height: number }>
}>('IOSKeyboardPlugin')

/** Releases resources owned by the currently initialized platform handler. */
let dispose = () => {}

/** Evaluates the physical spring described by UIKit's CASpringAnimation at native elapsed time. */
const springProgress = (
  time: number,
  { mass, stiffness, damping, velocity }: NonNullable<KeyboardAnimation['spring']>,
) => {
  const frequency = Math.sqrt(stiffness / mass)
  const decay = damping / (2 * mass)
  if (Math.abs(decay - frequency) < 0.0001) {
    return 1 - Math.exp(-frequency * time) * (1 + (frequency - velocity) * time)
  }
  if (decay < frequency) {
    const damped = Math.sqrt(frequency * frequency - decay * decay)
    return (
      1 - Math.exp(-decay * time) * (Math.cos(damped * time) + ((decay - velocity) / damped) * Math.sin(damped * time))
    )
  }
  const root = Math.sqrt(decay * decay - frequency * frequency)
  const first = -decay + root
  const second = -decay - root
  const weight = (velocity + second) / (first - second)
  return 1 + weight * Math.exp(first * time) - (1 + weight) * Math.exp(second * time)
}

/** Samples native animation metadata, accounting for time spent delivering the callback to JavaScript. */
const initNative = () => {
  let disposed = false
  let receivedEvent = false
  let lastId = -1
  let frame: number | null = null
  let motion: KeyboardAnimation | null = null
  let timing: KeyboardAnimation | null = null
  let closingStartedAt: number | null = null
  let wasEditing = store.getState().isKeyboardOpen
  let safeAreaBottom = getSafeAreaBottom()
  /** Maps elapsed native time through its cubic timing function. */
  let ease = (value: number) => value
  const handles: PluginListenerHandle[] = []

  /** Cancels a superseded animation frame. */
  const cancelFrame = () => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
  }

  /** Publishes the raw occlusion above the app's resting safe area. */
  const updateHeight = (rawHeight: number, open: boolean) => {
    virtualKeyboardStore.update({ height: Math.max(0, rawHeight - safeAreaBottom), open })
  }

  /** Applies the native timing function before sampling its physical spring. */
  const progressAt = (fraction: number, event: KeyboardAnimation) => {
    const eased = ease(fraction)
    return event.spring ? springProgress((eased * event.durationMs!) / 1000, event.spring) : eased
  }

  /** Reconstructs this frame's native height rather than advancing an independent spring. */
  const tick = () => {
    frame = null
    if (disposed || !motion) return
    const elapsed = Math.max(0, Date.now() - motion.startedAt!) * (motion.speed ?? 1)
    const duration = motion.durationMs ?? 0
    const finished = elapsed >= duration
    const progress = finished ? 1 : progressAt(elapsed / duration, motion)
    updateHeight(
      motion.fromHeight! + progress * (motion.toHeight - motion.fromHeight!),
      !finished || (motion.visible ?? motion.toHeight > 0),
    )
    if (!finished) frame = requestAnimationFrame(tick)
  }

  /** Publishes native timing to the shared store without restarting its clock. */
  const startMotion = (event: KeyboardAnimation) => {
    cancelFrame()
    ease = event.bezier ? cubicBezier(...event.bezier) : value => value
    motion = event
    tick()
    virtualKeyboardStore.update({
      motion:
        event.durationMs && event.startedAt !== undefined
          ? {
              startedAt: event.startedAt,
              duration: event.durationMs / (event.speed ?? 1),
              heights: Array.from({ length: 121 }, (_, index) => {
                const fraction = index / 120
                const progress = fraction === 1 ? 1 : progressAt(fraction, event)
                return Math.max(0, event.fromHeight! + progress * (event.toHeight - event.fromHeight!) - safeAreaBottom)
              }),
            }
          : undefined,
    })
  }

  /** Accepts native transitions and final geometry while ignoring stale notifications and drag focus. */
  const receive = (event: KeyboardAnimation) => {
    if (disposed || event.id < lastId) return
    const visible = event.visible ?? event.toHeight > 0
    // A delayed opening endpoint cannot override a dismissal already started by edit mode.
    if (closingStartedAt !== null && event.stage === 'end' && visible) return
    if (visible && store.getState().longPress !== LongPressState.Inactive) return
    if (event.stage === 'start') {
      timing = event
      // The estimate prepares compositor tracks; the real event supplies the authoritative native clock.
      closingStartedAt = null
    }
    receivedEvent = true
    lastId = event.id
    cancelFrame()
    safeAreaBottom = getSafeAreaBottom()
    // Keep the open height cached while hiding so openPercent can still fade toward zero.
    if (visible) viewportStore.update({ virtualKeyboardHeight: Math.max(0, event.toHeight - safeAreaBottom) })
    if (event.stage === 'end') {
      motion = null
      updateHeight(event.toHeight, event.toHeight > 0)
      virtualKeyboardStore.update({ motion: undefined })
    } else {
      startMotion(event)
    }
  }

  /** Starts a known dismissal before WebKit finishes delivering the native hide notification. */
  const unsubscribeEditMode = store.subscribe(() => {
    const editing = store.getState().isKeyboardOpen
    if (editing === wasEditing) return
    wasEditing = editing
    const { height, open } = virtualKeyboardStore.getState()
    if (editing || !open || height <= 0 || !timing || motion?.toHeight === 0) return
    // Selection can leave edit mode while its editor retains native focus and the keyboard stays up.
    const activeElement = document.activeElement
    if (
      activeElement instanceof HTMLElement &&
      (activeElement.isContentEditable || activeElement.matches('input, textarea'))
    )
      return
    closingStartedAt = Date.now()
    startMotion({
      ...timing,
      fromHeight: height + safeAreaBottom,
      toHeight: 0,
      visible: false,
      startedAt: closingStartedAt,
    })
  })

  void IOSKeyboardPlugin.addListener('keyboardAnimation', receive).then(handle => {
    if (disposed) void handle.remove()
    else handles.push(handle)
  })
  void IOSKeyboardPlugin.getState().then(state => {
    if (!disposed && !receivedEvent) {
      if (state.height > 0) viewportStore.update({ virtualKeyboardHeight: Math.max(0, state.height - safeAreaBottom) })
      updateHeight(state.height, state.height > 0)
    }
  })

  return () => {
    disposed = true
    unsubscribeEditMode()
    cancelFrame()
    motion = null
    virtualKeyboardStore.update({ motion: undefined })
    handles.forEach(handle => void handle.remove())
  }
}

/** Tracks iOS keyboard animation timing and normalized height through the shared keyboard store. */
const iOSCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    dispose()
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return
    dispose = Capacitor.isPluginAvailable('IOSKeyboardPlugin') ? initNative() : initFallback()
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
