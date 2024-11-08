import { BrowserEnvironment } from '../types'

/** Returns a proxy getSelection object with async getters for selection properties. WebdriverIO cannot retrieve the entire selection object so we delegate to asynchronous getters. Top-level selection properties (e.g. .focusNode) are compatible with nested properties (e.g. .focusNode.textContent) are compatible with parent properties by defining ad hoc getters on promises.
 *
 * @example
 * await getSelection().focusOffset
 * await getSelection().focusNode
 * await getSelection().focusNode?.textContent
 * await getSelection().focusNode?.nodeType
 *
 **/
const getSelection = (browser: BrowserEnvironment) => {
  return {
    get focusOffset(): Promise<number | undefined> {
      return browser.execute(() => window.getSelection()?.focusOffset)
    },
    get focusNode() {
      let propertyAccessed = false

      const focusNodePromise = new Promise(resolve =>
        setTimeout(() => {
          // only get focusNode if a property has not been accessed
          resolve(propertyAccessed ? {} : browser.execute(() => window.getSelection()?.focusNode))
        }),
      )

      Object.defineProperty(focusNodePromise, 'textContent', {
        get: function (): Promise<string | undefined | null> {
          // short-circuit the focusNodePromise since we are accessing a property
          propertyAccessed = true
          return browser.execute(() => window.getSelection()?.focusNode?.textContent)
        },
      })

      Object.defineProperty(focusNodePromise, 'nodeType', {
        get: function (): Promise<number | undefined> {
          // short-circuit the focusNodePromise since we are accessing a property
          propertyAccessed = true
          return browser.execute(() => window.getSelection()?.focusNode?.nodeType)
        },
      })

      // add the textContent property
      // add undefined to match the native browser api
      return focusNodePromise as
        | (typeof focusNodePromise & {
            textContent: Promise<string | null | undefined>
            nodeType: Promise<number | undefined>
          })
        | undefined
    },
  }
}

export default getSelection
