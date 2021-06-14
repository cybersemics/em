/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import initPage from '../helpers/initPage'
import helpers from '../helpers'
import { Page } from 'puppeteer'

jest.setTimeout(20000)

const {
  newThought,
  press,
  ref,
  type,
  waitForAlert,
} = helpers

beforeEach(async () => {
  ref.current = await initPage()
})

afterEach(async () => {
  await ref.current.browserContext().close()
})

it('do not allow duplicate thought on edit', async () => {
  await newThought('ab')
  await newThought('a')
  await type('b')
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
