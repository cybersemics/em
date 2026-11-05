import State from '../@types/State'
import { isCapacitor } from '../browser'
import download from '../device/download'
import share from '../device/share'
import debugLog from './debugLog'
import timestamp from './timestamp'

/** Saves the formatted debug log off the device: the native share sheet in the iOS and Android apps, a file download everywhere else. A native WebView has no download manager, so the anchor click that download() performs is silently ignored there. Mobile browsers are unaffected: iOS Safari and Android Chrome both save the blob to Files/Downloads. Takes fresh state so that format() can append the state.thoughts dump that resolves the ids in the entries to values. Returns the number of entries saved. */
const saveDebugLog = (state: State): number => {
  const text = debugLog.format(state)
  const filename = `em-debug-log-${timestamp()}.txt`
  if (isCapacitor()) {
    share({ text, title: filename })
  } else {
    download(text, filename)
  }
  return debugLog.read().length
}

export default saveDebugLog
