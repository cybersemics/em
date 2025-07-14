import path from 'path'
import { KnownDevices } from 'puppeteer'
import configureSnapshots from '../configureSnapshots'
import clickThought from '../helpers/clickThought'
import emulate from '../helpers/emulate'
import longPressThought from '../helpers/longPressThought'
import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

describe('multiselect', () => {
  it('should multiselect two thoughts at once', async () => {
    await paste(`
        - a
        - b
        `)

    await multiselectThoughts(['a', 'b'])

    expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'multiselect' })
  })
})

describe('mobile only', () => {
  beforeEach(async () => {
    await emulate(KnownDevices['iPhone 11'])
  }, 10000)

  it('should multiselect two thoughts at once', async () => {
    await paste(`
        - a
        - b
        `)

    await clickThought('b')
    await longPressThought('a')
    await longPressThought('b')

    expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'multiselect-ios' })
  })
})
