import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import MimeType from '../@types/MimeType'
import download from './download'

interface ShareOptions {
  /** The content to share. */
  text: string
  /** A short title for the shared content. */
  title: string
  /** The filename used when falling back to a file download. */
  filename: string
  /** The MIME type used when falling back to a file download. */
  mimeType?: MimeType
}

/** Shares text via the native share sheet on Capacitor, or the Web Share API in the browser, falling back to a file download when neither is available. Resolves silently if the user cancels the share. */
const share = async ({ text, title, filename, mimeType }: ShareOptions): Promise<void> => {
  try {
    // use the native share sheet on iOS/Android, since the WebView's Web Share API can download the content instead of opening the share dialog
    if (Capacitor.isNativePlatform() && (await Share.canShare()).value) {
      await Share.share({ text, title, dialogTitle: title })
    }
    // otherwise use the Web Share API if available
    else if (navigator.share) {
      await navigator.share({ text, title })
    }
    // otherwise download the data with createObjectURL
    else {
      download(text, filename, mimeType)
    }
  } catch (err) {
    // ignore AbortError, which is thrown when the user cancels the share
    if ((err as Error).name === 'AbortError') return
    throw err
  }
}

export default share
