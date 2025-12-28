import { HOME_TOKEN } from '../../../constants.js'

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const em = (window as any).em
      em.testHelpers.importToContext(_pathUnranked, _text)
    },
    _pathUnranked,
    _text,
  )

  await browser.pause(10000)
}

export default paste
