import { KnownDevices } from 'puppeteer'
import emulate from '../helpers/emulate'
import longPressThought from '../helpers/longPressThought'
import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('multiselect', () => {
  it('should multiselect two thoughts at once', async () => {
    await paste(`
        - a
        - b
        `)

    await multiselectThoughts(['a', 'b'])

    await waitUntil(() => {
      const highlightedBullets = document.querySelectorAll('[aria-label="bullet"][data-highlighted="true"]').length
      const commandMenuText = document.querySelector('[data-testid="alert-content"]')?.textContent || ''
      return highlightedBullets === 2 && commandMenuText.includes('2 thoughts selected')
    })
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

    // Wait for both bullets to be highlighted and command menu to update
    await waitUntil(() => {
      const highlightedBullets = document.querySelectorAll('[aria-label="bullet"][data-highlighted="true"]').length
      const commandMenuText = document.querySelector('[data-testid="command-menu-panel"]')?.textContent || ''
      return highlightedBullets === 2 && commandMenuText.includes('2 thoughts selected')
    })
  })
})
