import { Browser } from 'webdriverio'
import { HOME_TOKEN } from '../../../constants'
import { WindowEm } from '../../../initialize'

// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/prefer-namespace-keyword
declare module global {
  const browser: Browser<'async'>
}

const em = window.em as WindowEm

async function paste(text: string): Promise<void>
async function paste(pathUnranked: string[], text: string): Promise<void>

/** Import text on given unranked path using exposed testHelpers. */
async function paste(pathUnranked: string | string[], text?: string): Promise<void> {
  const _pathUnranked = typeof pathUnranked === 'string' ? [HOME_TOKEN] : (pathUnranked as string[])
  const _text = typeof pathUnranked === 'string' ? pathUnranked : text!

  // Note: This helper is exposed because copy paste seemed impossible in headless mode. With headless false copy paste with ctrl + v seems to work. ??
  await global.browser.execute(
    (_pathUnranked: string[], _text: string) => {
      const testHelpers = em.testHelpers
      testHelpers.importToContext(_pathUnranked, _text)
    },
    _pathUnranked,
    _text,
  )
}

export default paste
