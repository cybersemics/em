import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

/** Opens the native share dialog (Capacitor) on iOS/Android, or the Web Share API in the browser. Returns true if a share mechanism was invoked (even if the user cancels the dialog), or false if none is available so the caller can fall back to a download. */
const share = async ({ text, title }: { text: string; title?: string }): Promise<boolean> => {
  // use the native share dialog in the Capacitor app, since the Web Share API (navigator.share) is unavailable in the Android WebView
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({ text, title })
    } catch {
      // user canceled the share dialog
    }
    return true
  }
  // otherwise use the Web Share API if available
  else if (navigator.share) {
    try {
      await navigator.share({ text, title })
    } catch {
      // user canceled the share dialog
    }
    return true
  }
  return false
}

export default share
