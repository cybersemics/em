/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import initPage from '../helpers/initPage'
import testDriver from '../helpers'
import { Page } from 'puppeteer'

let page: { current: Page } = {} as { current: Page }
jest.setTimeout(20000)

const {
  newThought,
  press,
  waitForAlert,
} = testDriver(page)

beforeEach(async () => {
  page.current = await initPage()
})

afterEach(async () => {
  await page.current.browserContext().close()
})

it('do not allow duplicate thought on edit', async () => {
  await newThought('ab')
  await newThought('a')
  await page.current.keyboard.type('b')
  await waitForAlert('Duplicate thought')
})

it('do not allow duplicate thought after split (left half)', async () => {
  await newThought('a')
  await newThought('ab')
  await press('ArrowLeft')
  await press('Enter')
  await waitForAlert('Duplicate thought')
})

it('do not allow duplicate thought after split (right half)', async () => {
  await newThought('a')
  await newThought('ba')
  await press('ArrowLeft')
  await press('Enter')
  await waitForAlert('Duplicate thought')
})

it('do not allow duplicate thought after split symmetric', async () => {
  await newThought('haha')
  await press('ArrowLeft')
  await press('ArrowLeft')
  await press('Enter')
  await waitForAlert('Duplicate thought')
})
