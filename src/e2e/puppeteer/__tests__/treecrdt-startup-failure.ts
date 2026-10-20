import keyboard from '../helpers/keyboard'
import press from '../helpers/press'
import waitForSelector from '../helpers/waitForSelector'
import { page, setPage } from '../session'
import { createTreecrdtTestPage } from '../setup'

vi.setConfig({ testTimeout: 60000 })

/** Arranges a real OPFS file-open failure without replacing the provider or relying on path-length limits. */
const createThoughtspaceStorageConflict = async (thoughtspaceId: string): Promise<void> => {
  await page.evaluate(async id => {
    const root = await navigator.storage.getDirectory()
    await root.getDirectoryHandle(`treecrdt-em-memory-prototype-${id}.db`, { create: true })
  }, thoughtspaceId)
}

it('shows a startup error and keeps editing disabled when persistent storage cannot open', async () => {
  const thoughtspaceId = 'startup-failure'
  await createThoughtspaceStorageConflict(thoughtspaceId)
  const url = new URL(page.url())
  url.searchParams.set('share', thoughtspaceId)
  // Open the conflicted storage cold; the arrange page uses memory and has no persistent worker to tear down.
  setPage(await createTreecrdtTestPage(page.browserContext(), 'persistent'))
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
