import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import dragToQuickDropPanel from '../helpers/dragToQuickDropPanel'
import emulate from '../helpers/emulate'
import getEditable from '../helpers/getEditable'
import paste from '../helpers/paste'
import waitForAlertContent from '../helpers/waitForAlertContent'
import waitForEditable from '../helpers/waitForEditable'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Check if a thought is in the DOM. */
const isThoughtInDOM = async (value: string) => {
  const thoughtElement = await getEditable(value)
  const thoughtElementExists = await thoughtElement.evaluate(element => element !== null)
  return thoughtElementExists
}

describe('QuickDropPanel: mobile only', () => {
  beforeEach(async () => {
    await emulate(KnownDevices['iPhone 15 Pro'])
  }, 10000)

  it('should remove favorite thought when dropped on QuickDropPanel', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    await clickThought('a')
    await click('[aria-label="Add to Favorites"]')

    // wait until the favorite alert appears
    await waitForAlertContent('Added "a" to favorites')

    await dragToQuickDropPanel(await waitForEditable('a'))

    await waitForAlertContent('Removed 1 thought')

    // Assert that the thought element no longer exists
    expect(await isThoughtInDOM('a')).toBe(false)

    // Assert that other thoughts still exist
    expect(await isThoughtInDOM('b')).toBe(true)
    expect(await isThoughtInDOM('c')).toBe(true)
  })

  it('should remove normal thought when dropped on QuickDropPanel', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    await clickThought('a')

    await dragToQuickDropPanel(await waitForEditable('a'))

    await waitForAlertContent('Removed 1 thought')

    // Assert that the thought element no longer exists
    expect(await isThoughtInDOM('a')).toBe(false)

    // Assert that other thoughts still exist
    expect(await isThoughtInDOM('b')).toBe(true)
    expect(await isThoughtInDOM('c')).toBe(true)
  })
})
