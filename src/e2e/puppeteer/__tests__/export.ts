import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import deviceEmulation from '../helpers/deviceEmulation'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

// https://github.com/cybersemics/em/issues/3624
it('the JSON Snapshot option text fits inside the export format dropdown', async () => {
  await newThought('a')
  await clickToolbar('Export')
  await click('[aria-label="modal-content"] ::-p-text(Plain Text)')
  await waitForSelector('[aria-label="export format options"] ::-p-text(JSON Snapshot)')

  // the number of pixels by which the rendered text of the JSON Snapshot option extends past the right edge of the dropdown
  const overflow = await page.$eval('[aria-label="export format options"]', dropdown => {
    const label = Array.from(dropdown.querySelectorAll('span')).find(span => span.textContent === 'JSON Snapshot')
    if (!label) throw new Error('JSON Snapshot option not found in the export format dropdown.')
    const range = document.createRange()
    range.selectNodeContents(label)
    return range.getBoundingClientRect().right - dropdown.getBoundingClientRect().right
  })

  expect(overflow).toBeLessThanOrEqual(0)
})

// https://github.com/cybersemics/em/issues/3624
it('the export format dropdown stays on the screen when it opens near the right edge', async () => {
  // a short title with a subthought puts "Plain Text" at the end of the line near the right edge of the screen
  await paste(`
    - Ab
      - b
  `)
  await clickThought('Ab')
  await clickToolbar('Export')
  await waitForSelector('[aria-label="modal-content"] ::-p-text("Ab" and 1 subthought)')
  await click('[aria-label="modal-content"] ::-p-text(Plain Text)')
  await waitForSelector('[aria-label="export format options"]')

  // the number of pixels by which the dropdown extends past the right edge of the screen
  const overflow = await page.$eval(
    '[aria-label="export format options"]',
    dropdown => dropdown.getBoundingClientRect().right - window.innerWidth,
  )

  expect(overflow).toBeLessThanOrEqual(0)
})
