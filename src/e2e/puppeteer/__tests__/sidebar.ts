import path from 'path'
import type { WindowEm } from '../../../initialize'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import hideVisibility from '../helpers/hideVisibility'
import keyboard from '../helpers/keyboard'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import setTheme from '../helpers/setTheme'
import waitForEmIdle from '../helpers/waitForEmIdle'
import { page } from '../setup'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/** Open sidebar and wait for it to slide all the way open. */
const openSidebar = async () => {
  // Dispatch directly to avoid toolbar click flake in Browserless; this test covers sidebar rendering, not the menu button.
  await page.evaluate(() => {
    const em = window.em as WindowEm
    em.store.dispatch({ type: 'toggleSidebar', value: true })
  })
  await waitForEmIdle()
  // Wait for aria-hidden="false" and the first link to be on-screen (rect.left >= 0), since the outer sidebar is always mounted and doesn't reflect the drawer's slide-in animation.
  await page.waitForFunction(() => {
    const sidebar = document.querySelector('[data-testid="sidebar"]')
    if (!sidebar || sidebar.getAttribute('aria-hidden') !== 'false') return false
    const link = document.querySelector('[data-testid="sidebar-favorites"]')
    if (!link) return false
    const rect = link.getBoundingClientRect()
    return rect.left >= 0 && rect.width > 0
  })
}

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

    await openSidebar()
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
