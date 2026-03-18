import path from 'path'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import hide from '../helpers/hide'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot'
import scroll from '../helpers/scroll'
import { page } from '../setup'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

/** Set up the snapshot tests. These are defined in a function so they can be run at different font sizes (via adjusting the font size in beforeEach). */
const testSuite = (width: number) => {
  describe('', () => {
    beforeEach(hideHUD)
    beforeEach(async () => {
      await page.setViewport({
        width,
        height: 1400,
      })
    })

    it(`thoughts wrapping at ${width}px`, async () => {
      await paste(`
        - m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m
          - m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m
            - m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m m
      `)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })
  })
}

describe('Font Size: 18 (default)', () => {
  testSuite(560)
  testSuite(575)
})

describe('Font Size: 13', () => {
  beforeEach(async () => {
    await click('[data-testid=decrease-font]') // 17
    await click('[data-testid=decrease-font]') // 16
    await click('[data-testid=decrease-font]') // 15
    await click('[data-testid=decrease-font]') // 14
    await click('[data-testid=decrease-font]') // 13

    // close alert
    await hide('[data-testid=alert]')

    // scroll to top
    await scroll(0, 0)
  })

  testSuite(560)
  testSuite(575)
})

describe('Font Size: 28', () => {
  beforeEach(async () => {
    await click('[data-testid=increase-font]') // 19
    await click('[data-testid=increase-font]') // 20
    await click('[data-testid=increase-font]') // 21
    await click('[data-testid=increase-font]') // 22
    await click('[data-testid=increase-font]') // 23
    await click('[data-testid=increase-font]') // 24
    await click('[data-testid=increase-font]') // 25
    await click('[data-testid=increase-font]') // 26
    await click('[data-testid=increase-font]') // 27
    await click('[data-testid=increase-font]') // 28

    // close alert
    await hide('[data-testid=alert]')

    // scroll to top
    await scroll(0, 0)
  })

  testSuite(560)
  testSuite(575)
})
