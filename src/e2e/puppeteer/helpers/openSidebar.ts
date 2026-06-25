import { page } from '../session'
import click from './click'

/** Helper function to open sidebar and wait for it to slide all the way open. */
const openSidebar = async () => {
  await click('[aria-label=menu]')

  // Wait for the inert attribute to be removed and the first link to be on-screen (rect.left >= 0), since the outer sidebar is always mounted and doesn’t reflect the drawer’s slide-in animation.
  await page.waitForFunction(() => {
    const sidebar = document.querySelector('[data-testid="sidebar"]')
    if (!sidebar || sidebar.hasAttribute('inert')) return false
    const link = document.querySelector('[data-testid="sidebar-favorites"]')
    if (!link) return false
    const rect = link.getBoundingClientRect()
    return rect.left >= 0 && rect.width > 0
  })
}

export default openSidebar
