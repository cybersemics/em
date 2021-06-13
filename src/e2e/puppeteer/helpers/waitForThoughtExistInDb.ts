import { Page } from 'puppeteer'
import { WindowEm } from '../../../initialize'

const em = window.em as WindowEm

/** Wait for the given thought value to exist in the database. */
const waitForThoughtExistInDb = async (page: Page, value: string) => {
  await page.evaluate(async value => {
    await new Promise(resolve => {
      const testHelpers = em.testHelpers

      /** Check thought whether written to DB. */
      function checkThought() {
        setTimeout(async () => {
          const thoughtFromDB = await testHelpers.getLexemeFromDB(value)
          thoughtFromDB ? resolve(thoughtFromDB) : checkThought()
        }, 50)
      }
      checkThought()
    })
  }, value)
}

export default waitForThoughtExistInDb
