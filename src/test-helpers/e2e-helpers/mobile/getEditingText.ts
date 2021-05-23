
import { Browser } from 'webdriverio'
import execute from './execute'

/** Get the thought value that cursor on. */
const getEditingText = (browser: Browser<any>) => {
  return execute(browser, () => {
    return document.querySelector('.editing .editable')?.innerHTML
  })
}

export default getEditingText
