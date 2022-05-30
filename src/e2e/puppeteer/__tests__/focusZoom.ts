/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import { delay } from '../../../test-helpers/delay'
import helpers from '../helpers'

jest.setTimeout(20000)

const { paste, getEditable, waitForEditable, clickBullet, getComputedColor, clickThought } = helpers()

/**
 * Get alpha value from the rgba string.
 */
const parseAlphaFromRGBA = (value: string) => {
  const regex = /rgba\(\d{1,3},\d{1,3},\d{1,3},(.{1,})\)/
  const matches = regex.exec(value.replace(/ /g, ''))
  return matches && matches[1]
}

it('Hide siblings when curor has focus zoom.', async () => {
  const importText = `
  - a
  - b
    - =focus
      - Zoom`

  await paste(importText)
  await waitForEditable('b')
  await clickThought('b')

  await waitForEditable('a')

  // TODO: Create a waitForTransitionEnd helper
  // wait for animation to complete
  await delay(800)
  const editableNodeA = (await getEditable('a')).asElement()
  expect(editableNodeA).toBeDefined()

  const color = await getComputedColor(editableNodeA!)

  expect(parseAlphaFromRGBA(color)).toBe('0')
})

it('Allow edit mode when cursor has focus zoom.', async () => {
  // Related issue: https://github.com/cybersemics/em/issues/1448
  const importText = `
  - a
  - b
    - =focus
      - Zoom`

  await paste(importText)
  await waitForEditable('b')
  await waitForEditable('a')

  await clickThought('a')
  await clickBullet('b')

  // TODO: Create a waitForTransitionEnd helper
  // wait for animation to complete
  await delay(800)

  const editableNodeA = (await getEditable('a')).asElement()
  expect(editableNodeA).toBeDefined()

  const color = await getComputedColor(editableNodeA!)
  expect(parseAlphaFromRGBA(color)).toBe('0')

  await clickThought('b')

  // wait for animation to complete
  await delay(800)

  const editableNodeAUpdated = (await getEditable('a')).asElement()
  expect(editableNodeAUpdated).toBeDefined()

  const colorUpdated = await getComputedColor(editableNodeAUpdated!)
  expect(parseAlphaFromRGBA(colorUpdated)).toBe('0')
})
