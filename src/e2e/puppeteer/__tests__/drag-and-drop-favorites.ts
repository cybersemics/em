import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import dragAndDropFavorite from '../helpers/dragAndDropFavorite'
import paste from '../helpers/paste'
import press from '../helpers/press'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Get the order of favorites as displayed in the sidebar. */
const selectFavoritesText = async () => {
  const result = await page.evaluate(() => {
    // XPath to find all thought-links that are NOT in breadcrumbs, within drag-and-drop-favorite
    const xpath = `//*[@data-testid='drag-and-drop-favorite']//*[@data-thought-link and not(ancestor::*[@aria-label='context-breadcrumbs'])]`

    const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)

    const links = Array.from({ length: result.snapshotLength }, (_, i) => {
      const link = result.snapshotItem(i) as HTMLElement
      return link.textContent?.trim() || ''
    }).filter(text => text !== '')

    return links
  })

  return result
}

/** Open sidebar and wait for it to slide all the way open. */
const openSidebar = async () => {
  await click('[aria-label=menu]')
  // Wait for aria-hidden="false" and the first link to be on-screen (rect.left >= 0), since the outer sidebar is always mounted and doesn’t reflect the drawer’s slide-in animation.
  await page.waitForFunction(() => {
    const sidebar = document.querySelector('[data-testid="sidebar"]')
    if (!sidebar || sidebar.getAttribute('aria-hidden') !== 'false') return false
    const link = document.querySelector('[data-testid="sidebar-favorites"]')
    if (!link) return false
    const rect = link.getBoundingClientRect()
    return rect.left >= 0 && rect.width > 0
  })
}

describe('favorites drag and drop', () => {
  it('should reorder favorites by dragging and dropping', async () => {
    await paste(`
      - a
      - b
      - c
      - d
      - e
    `)

    // Add thoughts to favorites
    await clickThought('a')
    await click('[aria-label="Add to Favorites"]')

    await clickThought('b')
    await click('[aria-label="Add to Favorites"]')

    await clickThought('c')
    await click('[aria-label="Add to Favorites"]')

    await clickThought('d')
    await click('[aria-label="Add to Favorites"]')

    // Open favorites in sidebar
    await openSidebar()

    // Verify initial order
    expect(await selectFavoritesText()).toEqual(['a', 'b', 'c', 'd'])

    await dragAndDropFavorite('d', 'b', { position: 'before' })

    // Verify new order - d should now be before b
    expect(await selectFavoritesText()).toEqual(['a', 'd', 'b', 'c'])
  })

  it('should reorder favorites by dragging to the end or top of the list', async () => {
    await paste(`
      - a
- b
- c
- d
  - e
    `)

    // Add thoughts to favorites
    await clickThought('a')
    await click('[aria-label="Add to Favorites"]')

    await clickThought('b')
    await click('[aria-label="Add to Favorites"]')

    await clickThought('c')
    await click('[aria-label="Add to Favorites"]')

    await press('ArrowDown')
    await clickThought('e')
    await click('[aria-label="Add to Favorites"]')

    await openSidebar()

    // Verify initial order
    expect(await selectFavoritesText()).toEqual(['a', 'b', 'c', 'e'])

    // Drag "a" after "c"
    await dragAndDropFavorite('a', 'c', { position: 'after' })

    // Verify new order - a should now be after c
    expect(await selectFavoritesText()).toEqual(['b', 'c', 'a', 'e'])

    // Drag "e" before "b" (to the top)
    await dragAndDropFavorite('e', 'b', { position: 'before' })

    // Verify new order - c should now be before b
    expect(await selectFavoritesText()).toEqual(['e', 'b', 'c', 'a'])
  })
})
