import { KnownDevices } from 'puppeteer'
import sendFeedback from '../../../commands/sendFeedback'
import clickThought from '../helpers/clickThought'
import deviceEmulation from '../helpers/deviceEmulation'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import paste from '../helpers/paste'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

it('opens feedback with rdldr and returns to the unchanged thoughtspace on cancel', async () => {
  await paste('- aaa\n  - bbb')
  await clickThought('aaa')
  await gesture(sendFeedback)
  await waitForSelector('[role="dialog"][aria-labelledby="feedback-title"]')
  expect(await page.$eval('#feedback-title', element => element.textContent)).toBe('Send Feedback')
  await page.click('button[aria-label="Close feedback"]')
  await waitForSelector('[role="dialog"]', { hidden: true })
  expect(await exportThoughts()).toBe('\n- aaa\n  - bbb\n')
})
