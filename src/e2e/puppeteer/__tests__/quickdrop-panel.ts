import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import dragAndDropThought from '../helpers/dragAndDropThought'
import emulate from '../helpers/emulate'
import getEditable from '../helpers/getEditable'
import longPressThought from '../helpers/longPressThought'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Check if a thought is in the DOM. */
const isThoughtInDOM = async (value: string) => {
  const thoughtElement = await getEditable(value)
  const thoughtElementExists = await thoughtElement.evaluate(element => element !== null)
  return thoughtElementExists
}

/** Move mouse to QuickDropPanel area (right edge, 2em width ≈ 32px). */
const dropOnQuickDropPanel = async () => {
  // Get viewport dimensions to calculate QuickDropPanel position (right edge)
  const viewport = await page.viewport()
  if (!viewport) throw new Error('Viewport not available')

  const position = {
    x: viewport.width - 16, // Center of the 2em (32px) drop zone
    y: viewport.height / 2, // Middle of the screen vertically
  }

  await page.mouse.move(position.x, position.y)
}

describe('Quick Drop Panel', () => {
  it('should remove favorite thought when dropped on QuickDropPanel', async () => {
    await paste(`
      - a
    `)

    // Assert that the thought element exists
    expect(await isThoughtInDOM('a')).toBe(true)

    await clickThought('a')
    await click('[aria-label="Add to Favorites"]')

    // wait until the favorite alert appears
    await waitUntil(() => {
      const favoriteAlertContent = document.querySelector('[data-testid="alert-content"]')
      return favoriteAlertContent?.textContent?.includes('Added a to favorites')
    })

    // trigger long press and show invisible QuickDropPanel
    await dragAndDropThought('a', null, {
      position: 'none',
      mouseUp: false,
      showAlert: true,
    })

    await dropOnQuickDropPanel()

    await waitUntil(() => {
      const alertElement = document.querySelector('[data-testid="alert-content"]')
      return alertElement?.textContent?.includes('Drop to remove a')
    })

    // Complete the drop
    await page.mouse.up()

    await waitUntil(() => {
      const alertElement = document.querySelector('[data-testid="alert-content"]')
      return alertElement?.textContent?.includes('Removed 1 thought')
    })

    // Assert that the thought element no longer exists
    expect(await isThoughtInDOM('a')).toBe(false)
  })

  it('should delete regular thought when dropped on QuickDropPanel', async () => {
    await paste(`
      - a
    `)

    // Assert that the thought element exists
    expect(await isThoughtInDOM('a')).toBe(true)

    // trigger long press and show invisible QuickDropPanel
    await dragAndDropThought('a', null, {
      position: 'none',
      mouseUp: false,
      showAlert: true,
    })

    await dropOnQuickDropPanel()

    await waitUntil(() => {
      const alertElement = document.querySelector('[data-testid="alert-content"]')
      return alertElement?.textContent?.includes('Drop to remove a')
    })

    // Complete the drop
    await page.mouse.up()

    await waitUntil(() => {
      const alertElement = document.querySelector('[data-testid="alert-content"]')
      return alertElement?.textContent?.includes('Removed 1 thought')
    })

    // Assert that the thought element no longer exists
    expect(await isThoughtInDOM('a')).toBe(false)
  })
})

describe('mobile only', () => {
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
    await waitUntil(() => {
      const favoriteAlertContent = document.querySelector('[data-testid="alert-content"]')
      return favoriteAlertContent?.textContent?.includes('Added a to favorites')
    })

    await longPressThought(await waitForEditable('a'), { quickDrop: true })

    await waitUntil(() => {
      const alertElement = document.querySelector('[data-testid="alert-content"]')
      return alertElement?.textContent?.includes('Removed 1 thought')
    })

    // Assert that the thought element no longer exists
    expect(await isThoughtInDOM('a')).toBe(false)

    // Assert that other thoughts still exist
    expect(await isThoughtInDOM('b')).toBe(true)
    expect(await isThoughtInDOM('c')).toBe(true)
  })
})
