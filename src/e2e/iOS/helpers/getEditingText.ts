import { Browser } from 'webdriverio'

/** Get the thought value that cursor on. */
const getEditingText = (browser: Browser<'async'>): Promise<string | undefined> => {
  return browser.execute(() => {
    return document.querySelector('.editing .editable')?.innerHTML
  })
}

export default getEditingText
