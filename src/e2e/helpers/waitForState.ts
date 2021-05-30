import { Page } from 'puppeteer'

/**
 * Wait until value of the state for the given property path equals the given value.
 */
const waitForState = async (page: Page, path: string, value: any) => {
  await page.evaluate(async (path, value) => {
    await new Promise(resolve => {
      const { getState, _, subscribe } = (window.em as any).testHelpers

      /** Listen state changes. */
      const stateListener = () => {
        if (_.get(getState(), path) === value) {
          unsubscribe()
          resolve(true)
        }
      }

      const unsubscribe = subscribe(stateListener)
      stateListener()
    })
  }, path, value)
}

export default waitForState
