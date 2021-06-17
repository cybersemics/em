/* eslint-disable fp/no-get-set */
import { Browser } from 'webdriverio'

/** Returns a proxy getSelection object with async getters for selection properties. WebdriverIO cannot retrieve the entire selection object so we delegate to asynchronous getters. Top-level selection properties (e.g. .focusNode) are compatible with nested properties (e.g. .focusNode.textContent) are compatible with parent properties by defining ad hoc getters on promises.
 *
 * @example
 * await getSelection().focusOffset
 * await getSelection().focusNode
 * await getSelection().focusNode?.textContent
 *
 **/
const getSelection = (browser: Browser<'async'>) => {

  return {
    get focusOffset(): Promise<number | undefined> {
      return browser.execute(() => window.getSelection()?.focusOffset)
    },
    get focusNode() {
      const focusNodePromise = browser.execute(() => window.getSelection()?.focusNode)
      // eslint-disable-next-line fp/no-mutating-methods
      Object.defineProperty(focusNodePromise, 'textContent', {
        get: function(): Promise<string | undefined | null> {
          return browser.execute(() => window.getSelection()?.focusNode?.textContent)
        }
      })
      // add the textContent property
      // add undefined to match the native browser api
      return focusNodePromise as typeof focusNodePromise & {
        textContent: Promise<string | null | undefined>,
      } | undefined
    },
  }

}

export default getSelection
