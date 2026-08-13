import { page } from '../session'
import click from './click'

/** Helper function to open sidebar and wait for it to slide all the way open. */
const openSidebar = async () => {
  // Typing can hide the menu in distraction-free mode. Moving the pointer reveals it before clicking.
  await page.mouse.move(1, 1)
  await click('[aria-label=menu]')

  // Wait for the sidebar to mount without the inert attribute and for the first link to be on-screen (rect.left >= 0), since the outer sidebar container doesn't reflect the drawer's slide-in animation. (The sidebar subtree only mounts while open; it unmounts after the close animation completes.)
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
