/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import initPage from '../helpers/initPage'
import newThought from '../helpers/newThought'
import waitForAlert from '../helpers/waitForAlert'
import { Page } from 'puppeteer'

let page: Page
jest.setTimeout(20000)

beforeEach(async () => {
  page = await initPage()
})

afterEach(async () => {
  await page.browserContext().close()
})

it('do not allow duplicate thought on edit', async () => {
  await newThought(page, 'ab')
  await newThought(page, 'a')
  await page.keyboard.type('b')
  await waitForAlert(page, 'Duplicate thought')
})

it('do not allow duplicate thought after split (left half)', async () => {
  await newThought(page, 'a')
  await newThought(page, 'ab')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Enter')
  await waitForAlert(page, 'Duplicate thought')
})

it('do not allow duplicate thought after split (right half)', async () => {
  await newThought(page, 'a')
  await newThought(page, 'ba')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Enter')
  await waitForAlert(page, 'Duplicate thought')
})

it('do not allow duplicate thought after split symmetric', async () => {
  await newThought(page, 'haha')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Enter')
  await waitForAlert(page, 'Duplicate thought')
})
