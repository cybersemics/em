import { Page } from 'puppeteer'
import { HOME_TOKEN } from '../../../constants'
import { WindowEm } from '../../../initialize'

const em = window.em as WindowEm

async function paste(page: Page, text: string): Promise<void>
async function paste(page: Page, pathUnranked: string[], text: string): Promise<void>

/** Import text on given unranked path using exposed testHelpers. */
async function paste(page: Page, pathUnranked: string | string[], text?: string): Promise<void> {
  const _pathUnranked = typeof pathUnranked === 'string' ? [HOME_TOKEN] : (pathUnranked as string[])
  const _text = typeof pathUnranked === 'string' ? pathUnranked : text!
  // await new Promise(resolve => setTimeout(resolve, 200))

  // for some reason, we need to delay here, otherwise it does not paste when it is the first command in a test
  // does not work if the delay is added to the puppeteer setup function
  // 10ms definitely fails, 100ms seems to be safe
  await new Promise(resolve => setTimeout(resolve, 100))

  // Note: This helper is exposed because copy paste doesn't seem to work in headless mode. With headless false copy paste with ctrl + v seems to work.
  await page.evaluate(
    (_pathUnranked, _text) => {
      const testHelpers = em.testHelpers
      testHelpers.importToContext(_pathUnranked, _text)
    },
    _pathUnranked,
    _text,
  )
}

export default paste
