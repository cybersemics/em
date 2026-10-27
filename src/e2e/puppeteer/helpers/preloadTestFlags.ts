import { Page } from 'puppeteer'
import type { PreloadedEmWindow } from '../../../@types'

/** Test flags that can be preloaded. Everything passed to the page is serialized, so a flag that holds a function cannot be preloaded. */
export type PreloadedTestFlags = NonNullable<NonNullable<PreloadedEmWindow['em']>['testFlags']>

/** Merges test flags into window.em.testFlags before the app starts, on every later page load of the given page. The flags take effect on the next navigation, so a page that has already loaded must be reloaded. */
const preloadTestFlags = (target: Page, flags: PreloadedTestFlags) =>
  target.evaluateOnNewDocument(flags => {
    const preloadedWindow: PreloadedEmWindow = window
    preloadedWindow.em = {
      ...preloadedWindow.em,
      testFlags: {
        ...preloadedWindow.em?.testFlags,
        ...flags,
      },
    }
  }, flags)

export default preloadTestFlags
