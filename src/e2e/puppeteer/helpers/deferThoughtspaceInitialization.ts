import type { PreloadedEmWindow } from '../../../@types'
import { page } from '../session'
import waitForSelector from './waitForSelector'

/** Reloads behind the real startup gate and returns a function that releases initialization. This arrange-only hook makes the storage-opening phase deterministic without changing command behavior. Its preload script is removed after this reload, and the page is isolated per test. */
const deferThoughtspaceInitialization = async (): Promise<() => Promise<void>> => {
  const script = await page.evaluateOnNewDocument(() => {
    const preloadedWindow = window as unknown as PreloadedEmWindow
    preloadedWindow.em = {
      ...preloadedWindow.em,
      testFlags: {
        ...preloadedWindow.em?.testFlags,
        preventInitialize: true,
      },
    }
  })

  try {
    await page.reload({ waitUntil: 'domcontentloaded' })
  } finally {
    await page.removeScriptToEvaluateOnNewDocument(script.identifier)
  }
  await waitForSelector('[aria-label=thoughtspace-startup]')

  /** Releases the delayed storage boundary and waits for the interactive app to mount. */
  const resume = async () => {
    await page.evaluate(async () => {
      const initialize = window.em.testFlags.initialize
      if (!initialize) throw new Error('Thoughtspace initialization hook is unavailable')
      window.em.testFlags.preventInitialize = false
      await initialize({ storage: 'memory' })
    })
    await waitForSelector('[aria-label=thoughtspace-startup]', { hidden: true })
  }

  return resume
}

export default deferThoughtspaceInitialization
