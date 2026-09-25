import keyboard from '../helpers/keyboard'
import press from '../helpers/press'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'
import { usePersistentTreecrdtStorage } from '../setup'

vi.setConfig({ testTimeout: 60000 })
usePersistentTreecrdtStorage()

it('shows a startup error and keeps editing disabled when persistent storage cannot open', async () => {
  // Exceed SQLite's path capacity so the real dedicated-worker OPFS open fails deterministically.
  const url = new URL(page.url())
  url.searchParams.set('share', 'x'.repeat(512))
  await page.goto(url.href, { waitUntil: 'load' })
  await waitForSelector('[aria-label=thoughtspace-startup-error]')

  await press('Enter')
  await keyboard.type('unsaved thought')
  await press('Escape')

  const errorText = await page.$eval('[aria-label=thoughtspace-startup-error]', element => element.textContent)
  expect(errorText).toContain('em could not open this thoughtspace')
  expect(errorText).toContain('The editor is unavailable until initialization succeeds. Reload to try again.')
  expect(await page.$('[data-editable]')).toBeNull()
})
