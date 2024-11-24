import path from 'path'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import setTheme from '../helpers/setTheme'
import type from '../helpers/type'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Open sidebar and wait for it to slide all the way open. */
const fullyOpenSidebar = async () => {
  await click('[aria-label=menu]')
  await new Promise(resolve => setTimeout(resolve, 2000))
}

describe('sidebar', () => {
  it('empty sidebar on dark theme', async () => {
    await fullyOpenSidebar()

    expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'sidebar-empty' })
    await setTheme('Light')
    expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'sidebar-empty-light' })
  })

  it('recently edited thoughts', async () => {
    await press('Enter')
    await type('a')

    await fullyOpenSidebar()
    await click('[data-testid=sidebar-recentEdited]')

    expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'sidebar-recently-edited' })

    await setTheme('Light')
    expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'sidebar-recently-edited-light' })
  })
})
