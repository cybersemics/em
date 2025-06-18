import path from 'path'
import configureSnapshots from '../configureSnapshots'
import clickThought from '../helpers/clickThought'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

beforeEach(hideHUD)

describe('Divider', () => {
  it('highlight', async () => {
    await paste(`
        - a
        - ---
        - b
      `)

    // Ensure cursor is not on the divider
    await clickThought('a')

    const image1 = await screenshot()
    expect(image1).toMatchImageSnapshot()

    // Move cursor to the divider to ensure it's properly highlighted
    await press('ArrowDown')

    const image2 = await screenshot()
    expect(image2).toMatchImageSnapshot()
  })
})
