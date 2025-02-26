import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/** True if the platform supports haptic feedback. */
const hapticsSupported = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics')

/** Indicate light haptic feedback, typically by emitting one light tap. */
const light = () => {
  if (hapticsSupported) {
    Haptics.impact({ style: ImpactStyle.Light })
  }
}

/** Indicate medium haptic feedback, typically by emitting one medium tap. */
const medium = () => {
  if (hapticsSupported) {
    Haptics.impact({ style: ImpactStyle.Medium })
  }
}

/** Indicate heavy haptic feedback, typically by emitting one strong tap. */
const heavy = () => {
  if (hapticsSupported) {
    Haptics.impact({ style: ImpactStyle.Heavy })
  }
}

/** Indicate successful haptic feedback, typically by emitting two quick taps. */
const success = () => {
  if (hapticsSupported) {
    Haptics.notification({ type: NotificationType.Success })
  }
}

/** Indicate warning haptic feedback, typically by emitting two taps. */
const warning = () => {
  if (hapticsSupported) {
    Haptics.notification({ type: NotificationType.Warning })
  }
}

/** Indicate error haptic feedback, typically by emitting four quick taps. */
const error = () => {
  if (hapticsSupported) {
    Haptics.notification({ type: NotificationType.Error })
  }
}

/** Emit vibration haptic feedback. */
const vibrate = (duration = 300) => {
  if (hapticsSupported) {
    Haptics.vibrate({
      duration,
    })
  }
}

/**
 * Indicate selection changed haptic feedback, typically by emitting one light tap.
 * This starts and ends the selection haptic feedback to avoid callers needing to do so manually.
 */
const selectionChanged = () => {
  if (hapticsSupported) {
    Haptics.selectionStart()
    Haptics.selectionChanged()
    Haptics.selectionEnd()
  }
}

const haptics = {
  light,
  medium,
  heavy,
  success,
  warning,
  error,
  vibrate,
  selectionChanged,
}

export default haptics
