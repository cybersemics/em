import { KnownDevices } from 'puppeteer'
import { ElementHandle } from 'puppeteer'
import { JSHandle } from 'puppeteer'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import emulate from '../helpers/emulate'
import getEditable from '../helpers/getEditable'
import paste from '../helpers/paste'
import waitForAlertContent from '../helpers/waitForAlertContent'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Check if a thought is in the DOM. */
const isThoughtInDOM = async (value: string) => {
  const thoughtElement = await getEditable(value)
  const thoughtElementExists = await thoughtElement.evaluate(element => element !== null)
  return thoughtElementExists
}

/**
 * Long press a thought and drag it to the DropGutter to remove it.
 */
const dragToDropGutter = async (nodeHandle: ElementHandle<Element> | JSHandle<undefined>) => {
  const boundingBox = await nodeHandle.asElement()?.boundingBox()

  if (!boundingBox) throw new Error('Bounding box of element not found.')

  // Find the specific bullet element associated with this thought
  const bulletElement = await page.evaluateHandle(editableNode => {
    if (!editableNode) throw new Error('Node handle does not contain a valid Element')

    // Find the thought container that contains this editable
    const thoughtContainer = editableNode.closest('[aria-label="thought-container"]')
    if (!thoughtContainer) throw new Error('Thought container not found')

    // Find the bullet element within this specific thought container
    const bullet = thoughtContainer.querySelector('[aria-label="bullet"]')
    if (!bullet) throw new Error('Bullet not found in thought container')

    return bullet
  }, nodeHandle)

  if (!(bulletElement instanceof ElementHandle)) throw new Error('Bullet element not found')

  const coordinate = {
    x: boundingBox.x + 1,
    y: boundingBox.y + boundingBox.height / 2,
  }

  await page.touchscreen.touchStart(coordinate.x, coordinate.y)

  // Wait for this specific bullet to be highlighted
  await page.waitForFunction(
    (bulletEl: Element) => bulletEl.getAttribute('data-highlighted') === 'true',
    { timeout: 5000 },
    bulletElement,
  )

  // Drag to DropGutter
  const viewport = await page.viewport()
  if (!viewport) throw new Error('Viewport not available')

  const dropGutterPosition = {
    x: viewport.width - 16, // Center of the 2em (32px) drop zone
    y: viewport.height / 2, // Middle of the screen vertically
  }

  // Number of intermediate steps
  const steps = 10

  const deltaX = (dropGutterPosition.x - coordinate.x) / steps
  const deltaY = (dropGutterPosition.y - coordinate.y) / steps

  for (let i = 1; i <= steps; i++) {
    await page.touchscreen.touchMove(coordinate.x + deltaX * i, coordinate.y + deltaY * i)
  }

  // Wait for the "Drop to remove" alert
  await waitForAlertContent('Drop to remove')

  await page.touchscreen.touchEnd()
}

describe('DropGutter: mobile only', () => {
  beforeEach(async () => {
    await emulate(KnownDevices['iPhone 15 Pro'])
  }, 10000)

  it('should remove favorite thought when dropped on DropGutter', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    await page.evaluate(() => {
      ;(window as any).em.testFlags.logActions = true
    })
    await clickThought('a')
    console.log('DIAG_BEFORE_TAP:', JSON.stringify(await page.evaluate((() => {
      const btn = document.querySelector('[aria-label="Add to Favorites"]') as HTMLElement | null
      const toolbar = document.querySelector('#toolbar') as HTMLElement | null
      const r = btn?.getBoundingClientRect()
      return {
        scrollLeft: toolbar?.scrollLeft,
        clientWidth: toolbar?.clientWidth,
        rect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) } : null,
        topAtCenter: r ? (document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) as HTMLElement | null)?.closest('[aria-label]')?.getAttribute('aria-label') ?? null : null,
        editing: document.querySelector('[data-editing=true] [data-editable]')?.innerHTML ?? null,
        alert: document.querySelector('[data-testid="alert-content"]')?.textContent ?? null,
      }
    }))))
    await click('[aria-label="Add to Favorites"]')
    try {
      await waitForAlertContent('Added "a" to favorites')
    } catch (e) {
      console.log('DIAG_FAILED:', JSON.stringify(await page.evaluate((() => {
      const btn = document.querySelector('[aria-label="Add to Favorites"]') as HTMLElement | null
      const toolbar = document.querySelector('#toolbar') as HTMLElement | null
      const r = btn?.getBoundingClientRect()
      return {
        scrollLeft: toolbar?.scrollLeft,
        clientWidth: toolbar?.clientWidth,
        rect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) } : null,
        topAtCenter: r ? (document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) as HTMLElement | null)?.closest('[aria-label]')?.getAttribute('aria-label') ?? null : null,
        editing: document.querySelector('[data-editing=true] [data-editable]')?.innerHTML ?? null,
        alert: document.querySelector('[data-testid="alert-content"]')?.textContent ?? null,
      }
    }))))
      throw e
    }

    await dragToDropGutter(await waitForEditable('a'))

    await waitForAlertContent('Removed 1 thought')

    // Assert that the thought element no longer exists
    expect(await isThoughtInDOM('a')).toBe(false)

    // Assert that other thoughts still exist
    expect(await isThoughtInDOM('b')).toBe(true)
    expect(await isThoughtInDOM('c')).toBe(true)
  })

  it('should remove normal thought when dropped on DropGutter', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    await clickThought('a')

    await dragToDropGutter(await waitForEditable('a'))

    await waitForAlertContent('Removed 1 thought')

    // Assert that the thought element no longer exists
    expect(await isThoughtInDOM('a')).toBe(false)

    // Assert that other thoughts still exist
    expect(await isThoughtInDOM('b')).toBe(true)
    expect(await isThoughtInDOM('c')).toBe(true)
  })
})
