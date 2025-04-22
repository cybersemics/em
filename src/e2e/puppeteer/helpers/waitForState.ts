import { WindowEm } from '../../../initialize'
import { page } from '../setup'

const em = window.em as WindowEm

/**
 * Wait until value of the state for the given property path equals the given value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const waitForState = async (path: string, value: any) => {
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
