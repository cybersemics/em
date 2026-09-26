import { Capacitor, PluginListenerHandle } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import AndroidKeyboardAnimationEvent from '../../../@types/AndroidKeyboardAnimationEvent'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import viewportStore from '../../../stores/viewportStore'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import AndroidKeyboardPlugin from '../android/AndroidKeyboardPlugin'
import getSafeAreaBottom from '../getSafeAreaBottom'

interface Motion {
  id: number
  from: number
  to: number
  duration: number
  curve: number[]
  epoch?: number
}

/** Releases resources from the current handler initialization. */
let dispose = () => {}

/** Publishes Android keyboard geometry through the same scalar store used by iOS.
 * Android supplies the curve, scaled duration and monotonic start time once. Each JS animation
 * frame reconstructs the current height locally; no DOM positioning or streamed y values are used. */
const androidCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    dispose()
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    let disposed = false
    let frame: number | null = null
    let motion: Motion | null = null
    let clockOffset: number | null = null
    let lastId = -1
    let receivedEvent = false
    let safeAreaBottom = getSafeAreaBottom()
    const handles: PluginListenerHandle[] = []

    /** Converts the full native inset into height above the app's resting safe-area baseline. */
    const normalized = (height: number) => Math.max(0, height - safeAreaBottom)

    /** Owns asynchronous listener registration, including cleanup before registration finishes. */
    const listen = (registration: Promise<PluginListenerHandle>) => {
      void registration.then(handle => {
        if (disposed) void handle.remove()
        else handles.push(handle)
      })
    }

    /** Cancels the local animation when the native keyboard settles or a new motion replaces it. */
    const cancelFrame = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
    }

    /** Commits measured final geometry; an initial snapshot does not synthesize editor lifecycle events. */
    const settle = (height: number, reportPhase = true) => {
      cancelFrame()
      motion = null
      safeAreaBottom = getSafeAreaBottom()
      viewportStore.update({ virtualKeyboardHeight: normalized(height) })
      virtualKeyboardStore.update({
        height: normalized(height),
        open: height > 0,
        ...(reportPhase ? { phase: height > 0 ? 'open' : 'closed' } : {}),
      })
    }

    /** Samples the system curve at this JS frame's time and publishes the intermediate height. */
    const tick = (time: number) => {
      frame = null
      if (disposed || !motion || motion.epoch === undefined || clockOffset === null) return
      const fraction = Math.min(1, Math.max(0, (time + clockOffset - motion.epoch) / motion.duration))
      const index = fraction * (motion.curve.length - 1)
      const left = Math.floor(index)
      const right = Math.min(left + 1, motion.curve.length - 1)
      const eased = motion.curve[left] + (motion.curve[right] - motion.curve[left]) * (index - left)
      const height = normalized(motion.from + eased * (motion.to - motion.from))
      if (height !== virtualKeyboardStore.getState().height) virtualKeyboardStore.update({ height })
      if (fraction < 1) frame = requestAnimationFrame(tick)
    }

    /** Starts sampling once both clocks and the native epoch are available. */
    const schedule = () => {
      if (!disposed && frame === null && motion?.epoch !== undefined && clockOffset !== null) {
        frame = requestAnimationFrame(tick)
      }
    }

    /** Consumes lifecycle metadata and real endpoint changes, never per-frame native positions. */
    const receive = (event: AndroidKeyboardAnimationEvent) => {
      if (disposed || event.id < lastId) return
      receivedEvent = true
      if (event.stage === 'start' || event.stage === 'geometry') safeAreaBottom = getSafeAreaBottom()
      if (event.stage === 'snapshot') {
        lastId = event.id
        settle(event.toHeight)
      } else if (event.stage === 'start') {
        lastId = event.id
        cancelFrame()
        motion = null
        const duration = event.durationMs ?? 0
        const from = event.fromHeight ?? 0
        viewportStore.update({ virtualKeyboardHeight: normalized(event.toHeight) })
        virtualKeyboardStore.update({
          open: true,
          phase: event.toHeight > 0 ? 'opening' : 'closing',
          height: normalized(duration <= 0 ? event.toHeight : from),
        })
        if (duration > 0 && event.curve && event.curve.length > 1) {
          motion = { id: event.id, from, to: event.toHeight, duration, curve: event.curve }
        }
      } else if (event.stage === 'end') {
        lastId = event.id
        settle(event.toHeight)
      } else if (motion?.id === event.id) {
        if (event.stage === 'anchor' && event.epochMs !== undefined) motion.epoch = event.epochMs
        if (event.stage === 'geometry') {
          motion.to = event.toHeight
          viewportStore.update({ virtualKeyboardHeight: normalized(event.toHeight) })
        }
        schedule()
      }
    }

    dispose = () => {
      if (disposed) return
      disposed = true
      cancelFrame()
      motion = null
      handles.forEach(handle => void handle.remove())
    }

    if (!Capacitor.isPluginAvailable('AndroidKeyboardPlugin')) {
      // Older Android supplies lifecycle endpoints, but no curve/clock to reconstruct intermediate heights.
      listen(
        Keyboard.addListener('keyboardWillShow', info => {
          if (disposed) return
          viewportStore.update({ virtualKeyboardHeight: normalized(info.keyboardHeight) })
          virtualKeyboardStore.update({ open: true, phase: 'opening' })
        }),
      )
      listen(
        Keyboard.addListener('keyboardDidShow', info => {
          if (!disposed) settle(info.keyboardHeight)
        }),
      )
      listen(
        Keyboard.addListener('keyboardWillHide', () => {
          if (!disposed) virtualKeyboardStore.update({ open: true, phase: 'closing' })
        }),
      )
      listen(
        Keyboard.addListener('keyboardDidHide', () => {
          if (!disposed) settle(0)
        }),
      )
      return
    }

    listen(AndroidKeyboardPlugin.addListener('keyboardAnimation', receive))
    void AndroidKeyboardPlugin.getState().then(state => {
      if (!disposed && !receivedEvent) settle(state.height, false)
    })

    /** Calibrates the native clock against performance.now using the lowest round-trip sample. */
    const calibrate = async () => {
      let bestRoundTrip = Infinity
      let bestOffset = 0
      for (let i = 0; i < 30 && !disposed; i++) {
        const before = performance.now()
        const reply = await AndroidKeyboardPlugin.getClock()
        const after = performance.now()
        if (after - before < bestRoundTrip) {
          bestRoundTrip = after - before
          bestOffset = reply.nativeMs - (before + after) / 2
        }
        await new Promise(resolve => setTimeout(resolve, 8))
      }
      if (!disposed) {
        clockOffset = bestOffset
        schedule()
      }
    }
    void calibrate().catch(error => console.error('Unable to calibrate Android keyboard animation clock', error))
  },
  destroy: () => dispose(),
  show: () => {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Keyboard')) void Keyboard.show()
  },
}

export default androidCapacitorHandler
