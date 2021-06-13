/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import initPage from '../helpers/initPage'
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
  await page.keyboard.press('Enter', { delay: 20 })
  await page.keyboard.type('ab', { delay: 20 })
  await page.keyboard.press('Enter', { delay: 20 })
  await page.keyboard.type('a', { delay: 20 })
  await page.keyboard.type('b', { delay: 20 })
  await page.waitForXPath('//*[contains(text(), "Duplicate thought")]')
})

it('do not allow duplicate thought after split (left half)', async () => {
  await page.keyboard.press('Enter', { delay: 20 })
  await page.keyboard.type('a', { delay: 20 })
  await page.keyboard.press('Enter', { delay: 20 })
  await page.keyboard.type('ab', { delay: 20 })
  await page.keyboard.press('ArrowLeft', { delay: 20 })
  await page.keyboard.press('Enter', { delay: 20 })
  await page.waitForXPath('//*[contains(text(), "Duplicate thought")]')
})

it('do not allow duplicate thought after split (right half)', async () => {
  await page.keyboard.press('Enter', { delay: 20 })
  await page.keyboard.type('a', { delay: 20 })
  await page.keyboard.press('Enter', { delay: 20 })
  await page.keyboard.type('ba', { delay: 20 })
  await page.keyboard.press('ArrowLeft', { delay: 20 })
  await page.keyboard.press('Enter', { delay: 20 })
  await page.waitForXPath('//*[contains(text(), "Duplicate thought")]')
})

it('do not allow duplicate thought after split symmetric', async () => {
  await page.keyboard.press('Enter', { delay: 20 })
  await page.keyboard.type('haha', { delay: 20 })
  await page.keyboard.press('ArrowLeft', { delay: 20 })
  await page.keyboard.press('ArrowLeft', { delay: 20 })
  await page.keyboard.press('Enter', { delay: 20 })
  await page.waitForXPath('//*[contains(text(), "Duplicate thought")]')
})
