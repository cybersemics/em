/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import { Page } from 'puppeteer'
import initPage from '../helpers/initPage'
import helpers from '../helpers'

const {
  paste,
  ref: pageRef,
  getEditingText,
  refresh,
  waitForEditable,
  waitForThoughtExistInDb,
  waitForState,
  clickThought,
} = helpers

describe('cursor testing', () => {
  jest.setTimeout(20000)

  beforeEach(async () => {
    pageRef.current = await initPage()
  })

  afterEach(async () => {
    await pageRef.current!.browserContext().close()
  })

  it('cursor on a home thought', async () => {

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
    const thoughtValue = await getEditingText()
    expect(thoughtValue).toBe('B')
  })

  it('cursor on a subthought', async () => {

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
    const thoughtValue = await getEditingText()
    expect(thoughtValue).toBe('Z')
  })
})
