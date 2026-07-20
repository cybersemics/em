import path from 'path'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import hideVisibility from '../helpers/hideVisibility'
import keyboard from '../helpers/keyboard'
import openSidebar from '../helpers/openSidebar'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import setTheme from '../helpers/setTheme'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Screenshot without the toolbar. */
const screenshotWithoutToolbarIcons = async () => {
  await hideVisibility('[data-testid="toolbar-icon"]')
  return screenshot()
}

describe('sidebar', () => {
  it('empty sidebar', async () => {
    await openSidebar()

    expect(await screenshotWithoutToolbarIcons()).toMatchImageSnapshot({ customSnapshotIdentifier: 'sidebar-empty' })

    await setTheme('Light')

    expect(await screenshotWithoutToolbarIcons()).toMatchImageSnapshot({
      customSnapshotIdentifier: 'sidebar-empty-light',
    })
  })

  it('does not clip the bottom edge of the scroll area', async () => {
    await openSidebar()

    const maskCoverage = await page.evaluate(() => {
      const scroller = document.querySelector<HTMLElement>('[data-scroll-at-edge]')
      const maskCarrier = scroller?.parentElement
      const scrollArea = maskCarrier?.parentElement
      if (!scroller || !maskCarrier || !scrollArea) return null

      return {
        maskCarrierBottom: maskCarrier.getBoundingClientRect().bottom,
        scrollAreaHeight: scrollArea.getBoundingClientRect().height,
        scrollerBottom: scroller.getBoundingClientRect().bottom,
        scrollerHeight: scroller.getBoundingClientRect().height,
      }
    })

    if (!maskCoverage) throw new Error('Sidebar mask elements were not mounted.')

    expect(maskCoverage.maskCarrierBottom).toBeGreaterThanOrEqual(maskCoverage.scrollerBottom - 0.5)
    expect(maskCoverage.scrollerHeight).toBeCloseTo(maskCoverage.scrollAreaHeight)
  })

  it('recently edited thoughts', async () => {
    await press('Enter')
    await keyboard.type('a')
    await waitForSelector('[aria-label=menu]', { hidden: true })

    await openSidebar()
    await click('[data-testid=sidebar-section-picker]')
    await click('[data-testid=sidebar-recentlyEdited]')

    expect(await screenshotWithoutToolbarIcons()).toMatchImageSnapshot({
      customSnapshotIdentifier: 'sidebar-recently-edited',
    })

    await setTheme('Light')

    expect(await screenshotWithoutToolbarIcons()).toMatchImageSnapshot({
      customSnapshotIdentifier: 'sidebar-recently-edited-light',
    })
  })
})
