import path from 'path'
import { KnownDevices } from 'puppeteer'
import configureSnapshots from '../configureSnapshots'
import emulate from '../helpers/emulate'
import longPressThought from '../helpers/longPressThought'
import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

describe('multiselect', () => {
  it('should multiselect two thoughts at once', async () => {
    await paste(`
        - a
        - b
        `)

    await multiselectThoughts(['a', 'b'])

    const highlightedBullets = await page.$$('.bullet[data-highlighted=true]')
    const alertContent = await page.$eval('[data-testid=alert-content]', el => el.textContent)

    expect(highlightedBullets.length).toBe(2)
    expect(alertContent).toContain('2 thoughts selected')
  })
})

describe('mobile only', () => {
  beforeEach(async () => {
    await emulate(KnownDevices['iPhone 11'])
  }, 10000)

  it('should multiselect two thoughts at once', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    const a = await waitForEditable('a')
    const b = await waitForEditable('b')

    await longPressThought(a, { edge: 'right', x: 100 })
    await longPressThought(b, { edge: 'right', x: 100 })
    await page.screenshot({ path: '/mnt/c/Users/ethan/OneDrive/Desktop/multiselect.png' })
    const highlightedBullets = await page.$$('.bullet[data-highlighted=true]')
    const commandMenuPanelTextContent = await page.$eval('[data-testid=command-menu-panel]', el => el.textContent)

    expect(highlightedBullets.length).toBe(2)
    expect(commandMenuPanelTextContent).toContain('2 thoughts selected')
  })
})
