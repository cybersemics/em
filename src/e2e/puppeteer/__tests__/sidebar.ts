import path from 'path'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import hideVisibility from '../helpers/hideVisibility'
import keyboard from '../helpers/keyboard'
import openSidebar from '../helpers/openSidebar'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import setTheme from '../helpers/setTheme'
import { page } from '../setup'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/** Reveal controls that are hidden by distraction-free typing. */
const revealHud = () => page.mouse.move(1, 1)

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

    // Typing hides the hamburger menu in distraction-free mode. Moving the pointer reveals it before opening the sidebar.
    await revealHud()
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
