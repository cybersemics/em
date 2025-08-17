import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import dragAndDropFavorite from '../helpers/dragAndDropFavorite'
import { extractFavoriteText, getFavoriteElements } from '../helpers/getFavoriteElement'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Open sidebar and navigate to favorites section. */
const openFavorites = async () => {
  await click('[aria-label=menu]')
  await page.locator('[data-testid="sidebar"]').wait()
}

/** Get the order of favorites as displayed in the sidebar. */
const getFavoritesOrder = async (): Promise<string[]> => {
  const favoriteElements = await getFavoriteElements()
  return await Promise.all(favoriteElements.map(element => element.evaluate(extractFavoriteText)))
}

describe('favorites drag and drop', () => {
  beforeEach(async () => {
    await waitForSelector('[aria-label="Add to Favorites"]')
  })

  it('should reorder favorites by dragging and dropping', async () => {
    await paste(`
      - a
      - b
      - c
      - d
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
    await openFavorites()

    // Verify initial order
    expect(await getFavoritesOrder()).toEqual(['a', 'b', 'c', 'd'])

    await dragAndDropFavorite('d', 'b', { position: 'before' })

    // Verify new order - d should now be before b
    expect(await getFavoritesOrder()).toEqual(['a', 'd', 'b', 'c'])
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

    // Open favorites in sidebar
    await openFavorites()

    // Verify initial order
    expect(await getFavoritesOrder()).toEqual(['a', 'b', 'c', 'e'])

    // Drag "a" after "c"
    await dragAndDropFavorite('a', 'c', { position: 'after' })

    // Verify new order - a should now be after c
    expect(await getFavoritesOrder()).toEqual(['b', 'c', 'a', 'e'])

    // Drag "e" before "b" (to the top)
    await dragAndDropFavorite('e', 'b', { position: 'before' })

    // Verify new order - c should now be before b
    expect(await getFavoritesOrder()).toEqual(['e', 'b', 'c', 'a'])
  })
})
