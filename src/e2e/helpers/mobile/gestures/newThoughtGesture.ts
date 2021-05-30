import { Browser } from 'webdriverio'

/** New thought gesture. */
const newThoughtGesture = (browser: Browser<'async'>) => {
  return browser.touchPerform(
    [
      { action: 'press', options: { x: 70, y: 300 } },
      { action: 'wait', options: { ms: 100 } },
      { action: 'moveTo', options: { x: 140, y: 300 } },
      { action: 'wait', options: { ms: 100 } },
      { action: 'moveTo', options: { x: 140, y: 380 } },
      { action: 'wait', options: { ms: 100 } },
      { action: 'release', options: {} },
    ]
  )
}

export default newThoughtGesture
