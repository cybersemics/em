import { HOME_TOKEN } from '../../../constants.js'
import { WindowEm } from '../../../initialize.js'

// browser is provided globally by WDIO test runner
declare const browser: WebdriverIO.Browser

async function paste(text: string): Promise<void>
async function paste(pathUnranked: string[], text: string): Promise<void>

/** Import text on given unranked path using exposed testHelpers. */
async function paste(pathUnranked: string | string[], text?: string): Promise<void> {
  const _pathUnranked = typeof pathUnranked === 'string' ? [HOME_TOKEN] : (pathUnranked as string[])
  const _text = typeof pathUnranked === 'string' ? pathUnranked : text!

  // Note: This helper is exposed because copy paste doesn't work in headless mode.
  // Access window.em inside browser.execute() since window doesn't exist in Node context
  await browser.execute(
    (_pathUnranked: string[], _text: string) => {
      const em = window.em as WindowEm
      em.testHelpers.importToContext(_pathUnranked, _text)
    },
    _pathUnranked,
    _text,
  )

  // wait until react has rendered the DOM changes.
  await browser.execute(() => {
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })
  })
}

export default paste
