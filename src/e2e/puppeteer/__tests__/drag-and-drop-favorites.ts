import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import dragAndDropFavorite from '../helpers/dragAndDropFavorite'
import { extractFavoriteText, getFavoriteElements } from '../helpers/getFavoriteElement'
import paste from '../helpers/paste'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Open sidebar and navigate to favorites section. */
const openFavorites = async () => {
  await click('[aria-label=menu]')
  await page.locator('[data-testid="sidebar"]').wait()
  // Favorites is the default section, but click it to be sure
  await click('[data-testid="sidebar-favorites"]')
  // Wait for favorites content to load
  await waitForSelector('.favorites')
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

  it('should reorder favorites by dragging to the end and top of the list', async () => {
    await paste(`
      - first
      - second
      - third
    `)

    // Add thoughts to favorites
    await clickThought('first')
    await click('[aria-label="Add to Favorites"]')

    await clickThought('second')
    await click('[aria-label="Add to Favorites"]')

    await clickThought('third')
    await click('[aria-label="Add to Favorites"]')

    // Open favorites in sidebar
    await openFavorites()

    // Verify initial order
    expect(await getFavoritesOrder()).toEqual(['first', 'second', 'third'])

    // Drag "first" after "third" (to the end)
    await dragAndDropFavorite('first', 'third', { position: 'after' })

    // Verify new order - first should now be after third
    expect(await getFavoritesOrder()).toEqual(['second', 'third', 'first'])

    // Drag "third" before "second" (to the top)
    await dragAndDropFavorite('third', 'second', { position: 'before' })

    // Verify new order - third should now be before second
    expect(await getFavoritesOrder()).toEqual(['third', 'second', 'first'])
  })
})
