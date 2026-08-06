import { page } from '../session'

/** Waits for thoughtspace initialization and the given thought value to exist in the database. */
const waitForThoughtExistInDb = async (value: string) => {
  await page.evaluate(async value => {
    const testHelpers = window.em.testHelpers
    await testHelpers.waitForInitialized()

    await new Promise(resolve => {
      /** Polls for Lexeme in IndexedDB. */
      function pollForLexeme(value: string) {
        setTimeout(async () => {
          const thoughtFromDB = await testHelpers.getLexemeFromThoughtspace(value)
          if (thoughtFromDB) {
            resolve(thoughtFromDB)
          } else {
            pollForLexeme(value)
          }
        }, 50)
      }
      pollForLexeme(value)
    })
  }, value)
}

export default waitForThoughtExistInDb
