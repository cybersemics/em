import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import dragAndDropThought from '../helpers/dragAndDropThought'
import paste from '../helpers/paste'
import waitUntil from '../helpers/waitUntil'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Move mouse to QuickDropPanel area (right edge, 2em width ≈ 32px). */
const dropOnQuickDropPanel = async () => {
  // Get viewport dimensions to calculate QuickDropPanel position (right edge)
  const viewport = await page.viewport()
  if (!viewport) throw new Error('Viewport not available')

  // Move mouse to QuickDropPanel area (right edge, 2em width ≈ 32px)
  const quickDropX = viewport.width - 16 // Center of the 2em (32px) drop zone
  const quickDropY = viewport.height / 2 // Middle of the screen vertically

  await page.mouse.move(quickDropX, quickDropY)
}

describe('Quick Drop Panel', () => {
  it('should remove favorite thought when dropped on QuickDropPanel', async () => {
    await paste(`
      - My favorite
    `)

    await clickThought('My favorite')
    await click('[aria-label="Add to Favorites"]')

    // Verify the favorite alert appears
    const favoriteAlertContent = await page.$eval('[data-testid="alert-content"]', el => el.textContent)
    expect(favoriteAlertContent).toContain('Added My favorite to favorites')

    // Start dragging the thought (this will trigger long press and show QuickDropPanel)
    await dragAndDropThought('My favorite', null, {
      position: 'none',
      mouseUp: false,
      showAlert: true,
    })

    await dropOnQuickDropPanel()

    await waitUntil(() => {
      const alertElement = document.querySelector('[data-testid="alert-content"]')
      return alertElement?.textContent?.includes('Drop to remove My favorite')
    })

    // Complete the drop
    await page.mouse.up()

    await waitUntil(() => {
      const alertElement = document.querySelector('[data-testid="alert-content"]')
      return alertElement?.textContent?.includes('Removed 1 thought')
    })

    // Verify the thought has been deleted (should no longer be in the DOM)
    const deletedThought = await page.$('[data-editable*="My favorite"]')
    expect(deletedThought).toBeNull()
  })

  it('should delete regular thought when dropped on QuickDropPanel', async () => {
    // Start with empty thoughtspace and create a new thought (keep it short to avoid ellipsize)
    await paste(`
      - Delete me
    `)

    // Start dragging the thought (this will trigger long press and show QuickDropPanel)
    await dragAndDropThought('Delete me', null, {
      position: 'none',
      mouseUp: false,
      showAlert: true,
    })

    await dropOnQuickDropPanel()

    await waitUntil(() => {
      const alertElement = document.querySelector('[data-testid="alert-content"]')
      return alertElement?.textContent?.includes('Drop to remove Delete me')
    })

    // Complete the drop
    await page.mouse.up()

    await waitUntil(() => {
      const alertElement = document.querySelector('[data-testid="alert-content"]')
      return alertElement?.textContent?.includes('Removed 1 thought')
    })

    // Verify the thought has been deleted (should no longer be in the DOM)
    const deletedThought = await page.$('[data-editable*="Delete me"]')
    expect(deletedThought).toBeNull()
  })
})
