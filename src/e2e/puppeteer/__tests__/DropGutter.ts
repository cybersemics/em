import { KnownDevices } from 'puppeteer'
import { ElementHandle } from 'puppeteer'
import { JSHandle } from 'puppeteer'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import deviceEmulation from '../helpers/deviceEmulation'
import getEditable from '../helpers/getEditable'
import openSidebar from '../helpers/openSidebar'
import paste from '../helpers/paste'
import waitForAlert from '../helpers/waitForAlert'
import waitForEditable from '../helpers/waitForEditable'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

/** Check if a thought is in the DOM. */
const isThoughtInDOM = async (value: string) => {
  const thoughtElement = await getEditable(value)
  const thoughtElementExists = await thoughtElement.evaluate(element => element !== null)
  return thoughtElementExists
}

/**
 * Long press a thought or favorite and drag it over the DropGutter, holding it there without dropping.
 */
const dragToDropGutter = async (nodeHandle: ElementHandle<Element> | JSHandle<undefined> | null) => {
  const boundingBox = await nodeHandle?.asElement()?.boundingBox()

  if (!boundingBox) throw new Error('Bounding box of element not found.')

  const coordinate = {
    x: boundingBox.x + 1,
    y: boundingBox.y + boundingBox.height / 2,
  }

  await page.touchscreen.touchStart(coordinate.x, coordinate.y)

  // The drag hint appears once the long press begins, for thoughts and favorites alike.
  await waitForAlert('Drag and drop to')

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
}

/** Waits for the hint shown while a thought is held over the DropGutter. The wait is the assertion, so a timeout reports the alert that was shown instead. */
const waitForDropGutterHint = async (text: string) => {
  try {
    await page.waitForFunction(
      (text: string) => document.querySelector('[data-testid="alert-content"]')?.textContent === text,
      { timeout: 6000 },
      text,
    )
  } catch {
    const alertText = await page.evaluate(() => document.querySelector('[data-testid="alert-content"]')?.textContent)
    throw new Error(`Expected the DropGutter hint "${text}", but the alert read "${alertText}".`)
  }
}

describe('DropGutter: mobile only', () => {
  it('should remove favorite thought when dropped on DropGutter', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    await clickThought('a')
    await click('[aria-label="Add to Favorites"]')

    // wait until the favorite alert appears
    await waitForAlert('Added "a" to favorites')

    await dragToDropGutter(await waitForEditable('a'))
    await waitForAlert('Drop to delete a')
    await page.touchscreen.touchEnd()

    await waitForAlert('Removed 1 thought')

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
    await waitForAlert('Drop to delete a')
    await page.touchscreen.touchEnd()

    await waitForAlert('Removed 1 thought')

    // Assert that the thought element no longer exists
    expect(await isThoughtInDOM('a')).toBe(false)

    // Assert that other thoughts still exist
    expect(await isThoughtInDOM('b')).toBe(true)
    expect(await isThoughtInDOM('c')).toBe(true)
  })

  // https://github.com/cybersemics/em/issues/5856
  it('names an empty thought as empty thought in the drop to delete hint', async () => {
    await paste(`
        - a
          -
        `)

    await clickThought('a')

    await dragToDropGutter(await waitForEditable(''))

    await waitForDropGutterHint('Drop to delete empty thought')
  })

  // https://github.com/cybersemics/em/issues/5856
  it('names an empty favorite as empty thought in the drop to remove hint', async () => {
    await paste(`
        -
          - =favorite
            - true
        `)

    await openSidebar()

    await dragToDropGutter(await waitForSelector('[data-testid="drag-and-drop-favorite"]'))

    await waitForDropGutterHint('Drop to remove empty thought from favorites')
  })
})
