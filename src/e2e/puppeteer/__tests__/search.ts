import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

// https://github.com/cybersemics/em/issues/4177
it.skip('close the Search input with the Search command when no search text has been entered', async () => {
  await paste('- a')
  await clickThought('a')

  await press('f', { meta: true, alt: true })
  await waitForSelector('[placeholder="Search"]')

  await press('f', { meta: true, alt: true })

  try {
    await page.waitForFunction(() => !document.querySelector('[placeholder="Search"]'), { timeout: 5000 })
  } catch {
    const searchValue = await page.$eval('[placeholder="Search"]', el => el.textContent)
    throw new Error(
      `Expected the Search input to be dismissed, but it is still rendered with the value "${searchValue}".`,
    )
  }
})
