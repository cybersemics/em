/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import helpers from '../helpers'

describe('cursor testing', () => {
  jest.setTimeout(20000)

  const { paste, getEditingText, refresh, waitForEditable, waitForThoughtExistInDb, waitForState, clickThought } =
    helpers()

  // @MIGRATION_TODO
  it.skip('cursor on a home thought', async () => {
    const importText = `
    - A
    - B`
    await paste(importText)
    await waitForEditable('B')
    await clickThought('B')

    await waitForState('isPushing', false)
    await waitForThoughtExistInDb('B')
    await waitForThoughtExistInDb('A')
    await refresh()

    await waitForEditable('B')

    // wait for a re-render in case the lexeme was loaded after the parent
    // getEditingText will return undefined if we don't wait
    // we don't currently have a way to tell if a lexeme is missing or just loading
    await new Promise(resolve => setTimeout(resolve, 100))

    const thoughtValue = await getEditingText()
    expect(thoughtValue).toBe('B')
  })

  // @MIGRATION_TODO
  it.skip('cursor on a subthought', async () => {
    const importText = `
    - A
      - X
    - B
      - Y
      - Z`
    await paste(importText)
    await waitForEditable('B')
    await clickThought('B')
    await waitForEditable('Z')
    await clickThought('Z')

    await waitForState('isPushing', false)
    await waitForThoughtExistInDb('B')
    await waitForThoughtExistInDb('Z')
    await waitForThoughtExistInDb('A')

    await refresh()

    await waitForEditable('Z')

    // wait for a re-render in case the lexeme was loaded after the parent
    // getEditingText will return undefined if we don't wait
    // we don't currently have a way to tell if a lexeme is missing or just loading
    await new Promise(resolve => setTimeout(resolve, 100))

    const thoughtValue = await getEditingText()
    expect(thoughtValue).toBe('Z')
  })
})
