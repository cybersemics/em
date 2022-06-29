import { Page } from 'puppeteer'
import { WindowEm } from '../../../initialize'

const em = window.em as WindowEm

/**
 * Wait until value of the state for the given property path equals the given value.
 */
const waitForState = async (page: Page, path: string, value: any) => {
  await page.evaluate(
    async (path, value) => {
      await new Promise(resolve => {
        const { getState, _ } = em.testHelpers

        /** Listen state changes. */
        const stateListener = () => {
          if (_.get(getState(), path) === value) {
            resolve(true)
          }
        }

        stateListener()
      })
    },
    path,
    value,
  )
}

export default waitForState
