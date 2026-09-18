import type { PreloadedEmWindow } from '../../../@types'
import { page } from '../session'

/**
 * Reloads with background initialization held so startup interaction can be tested deterministically.
 * Returns an idempotent release function that runs the real initializer to completion. Call it in the
 * test body before asserting that interaction survives, and in finally for cleanup on failure.
 * The preloaded flag is isolated to this test's page; no production initializer is replaced.
 */
const reloadWithDeferredInitialization = async (): Promise<() => Promise<void>> => {
  await page.evaluateOnNewDocument(() => {
    const preloadedWindow: PreloadedEmWindow = window
    preloadedWindow.em = {
      ...preloadedWindow.em,
      testFlags: { ...preloadedWindow.em?.testFlags, preventInitialize: true },
    }
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.em?.testFlags.initialize === 'function')
  await page.waitForFunction(() => !document.querySelector('[aria-label=modal]'))
  await page.waitForSelector('[aria-label=empty-thoughtspace]')

  let initialization: Promise<void> | undefined
  return () =>
    (initialization ??= page.evaluate(async () => {
      const flags = window.em.testFlags
      if (!flags.initialize) throw new Error('Startup initializer is not available')
      try {
        await flags.initialize({ storage: 'memory' })
      } finally {
        flags.preventInitialize = false
      }
    }))
}

export default reloadWithDeferredInitialization
