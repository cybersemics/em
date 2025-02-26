import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/** Emit warning haptic feedback. */
const warning = () => {
  if (Capacitor.isNativePlatform()) {
    Haptics.notification({ type: NotificationType.Warning })
  }
}

/** Emit light haptic feedback. */
const light = () => {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style: ImpactStyle.Light })
  }
}

/** Emit selection start haptic feedback. */
const selectionStart = () => {
  if (Capacitor.isNativePlatform()) {
    Haptics.selectionStart()
  }
}

/** Emit selection changed haptic feedback. */
const selectionChanged = () => {
  if (Capacitor.isNativePlatform()) {
    Haptics.selectionChanged()
  }
}

/** Emit selection end haptic feedback. */
const selectionEnd = () => {
  if (Capacitor.isNativePlatform()) {
    Haptics.selectionEnd()
  }
}

const haptics = {
  warning,
  light,
  selectionStart,
  selectionChanged,
  selectionEnd,
}

export default haptics
