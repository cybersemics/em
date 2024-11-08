import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder'
import { page } from '../setup'

/** Initialize recorder. */
function init() {
  const recorder = new PuppeteerScreenRecorder(page)

  /** Start recording. */
  const start = async (filename: string) => recorder.start(filename)

  /** Stop recording. */
  const stop = async () => recorder.stop()

  return {
    start,
    stop,
  }
}

export default init
