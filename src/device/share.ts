import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

/** Opens the native share dialog (Capacitor) or the Web Share API (browser). Returns true if a share mechanism was available, or false if the caller should fall back to a download. User cancellation is swallowed and still returns true to avoid a spurious download. */
const share = async ({ text, title }: { text: string; title?: string }): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({ text, title })
    } catch {
      // user canceled
    }
    return true
  } else if (navigator.share) {
    try {
      await navigator.share({ text, title })
    } catch {
      // user canceled
    }
    return true
  }
  return false
}

export default share
