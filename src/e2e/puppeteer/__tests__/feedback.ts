import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import deviceEmulation from '../helpers/deviceEmulation'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

it('opens feedback with rdldr and returns to the unchanged thoughtspace on cancel', async () => {
  await paste('- aaa\n  - bbb')
  await clickThought('aaa')
  await gesture('rdldr')
  await waitForSelector('[role="dialog"][aria-labelledby="feedback-title"]')
  expect(await page.$eval('#feedback-title', element => element.textContent)).toBe('Send Feedback')
  await page.click('button[aria-label="Close feedback"]')
  await waitForSelector('[role="dialog"]', { hidden: true })
  expect(await exportThoughts()).toBe('\n- aaa\n  - bbb\n')
})

// https://github.com/cybersemics/em/issues/5687
it('keeps feedback typing and native undo out of the thoughtspace', async () => {
  await paste('- Keep this thought')
  await clickThought('Keep this thought')
  await command('newThought')
  await waitForEditable('')
  await gesture('rdldr')
  await waitForSelector('[role="dialog"][aria-labelledby="feedback-title"]')
  await click('textarea')
  await keyboard.type('First line')
  await press('Enter')
  await keyboard.type('Second line')
  expect(await page.$eval('textarea', element => element.value)).toBe('First line\nSecond line')

  await press('a', { ctrl: true })
  await press('Backspace')
  expect(await page.$eval('textarea', element => element.value)).toBe('')
  await press('z', { ctrl: true })
  expect(await page.$eval('textarea', element => element.value)).toBe('First line\nSecond line')
  await press('z', { ctrl: true, shift: true })
  expect(await page.$eval('textarea', element => element.value)).toBe('')

  await click('button[aria-label="Close feedback"]')
  await waitForSelector('[role="dialog"]', { hidden: true })
  expect(await exportThoughts()).toBe('\n- Keep this thought\n- \n')
})
