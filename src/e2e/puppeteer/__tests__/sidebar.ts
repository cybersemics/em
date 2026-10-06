import path from 'path'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import clickToolbar from '../helpers/clickToolbar'
import hideVisibility from '../helpers/hideVisibility'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import openSidebar from '../helpers/openSidebar'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import setTheme from '../helpers/setTheme'
import waitForEditable from '../helpers/waitForEditable'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/** Screenshot without the toolbar. */
const screenshotWithoutToolbarIcons = async () => {
  await hideVisibility('[data-testid="toolbar-icon"]')
  // New-thought command alerts are transient and unrelated to the sidebar snapshot.
  await hideVisibility('[data-testid="alert"]')
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

  // https://github.com/cybersemics/em/issues/5848
  it('empty favorite shows the empty-thought placeholder', async () => {
    await newThought()
    await clickToolbar('Add to Favorites')
    await openSidebar()

    const favoriteText = await page.$eval('[data-testid="favorites"] [data-thought-link]', el => el.textContent)
    expect(favoriteText).toBe('This is an empty thought')

    const placeholderStyle = await page.$eval('[data-testid="favorites"] ::-p-text(This is an empty thought)', el => {
      const { color, fontStyle } = getComputedStyle(el)
      return { color, fontStyle }
    })
    const outlinePlaceholderColor = await page.$eval('[data-editable]', el => getComputedStyle(el, '::before').color)
    expect(placeholderStyle).toEqual({ color: outlinePlaceholderColor, fontStyle: 'italic' })
  })

  // https://github.com/cybersemics/em/issues/5848
  it('empty ancestor in a favorite breadcrumb shows the empty-thought placeholder', async () => {
    await newThought()
    await clickToolbar('Add to Favorites')
    await press('Enter', { meta: true })
    await waitForEditable('')
    await clickToolbar('Add to Favorites')
    await openSidebar()

    const breadcrumbs = await page.$$eval(
      '[data-testid="favorites"] [aria-label="context-breadcrumbs"] [data-thought-link]',
      links => links.map(link => link.textContent),
    )
    expect(breadcrumbs).toEqual(['This is an empty thought'])
  })
})
