import { Page } from 'puppeteer'
import { WindowEm } from '../../../initialize'

declare module global {
  const page: Page;
}

const em = window.em as WindowEm

/**
 * Wait until value of the state for the given property path equals the given value.
 */
const waitForState = async (path: string, value: any) => {
  await global.page.evaluate(
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
