import { Page } from 'puppeteer'
import { WindowEm } from '../../../initialize'

const em = window.em as WindowEm

declare module global {
  const page: Page;
}

/** Wait for the given thought value to exist in the database. */
const waitForThoughtExistInDb = async (value: string) => {
  const page = global.page;
  await page.evaluate(async value => {
    await new Promise(resolve => {
      const testHelpers = em.testHelpers

      /** Polls for Lexeme in IndexedDB. */
      function pollForLexeme(value: string) {
        setTimeout(async () => {
          const thoughtFromDB = await testHelpers.getLexemeFromIndexedDB(value)
          thoughtFromDB ? resolve(thoughtFromDB) : pollForLexeme(value)
        }, 50)
      }
      pollForLexeme(value)
    })
  }, value)
}

export default waitForThoughtExistInDb
