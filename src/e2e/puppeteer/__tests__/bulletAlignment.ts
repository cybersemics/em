import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import deviceEmulation from '../helpers/deviceEmulation'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import waitForBrowserSettled from '../helpers/waitForBrowserSettled'
import waitForEditable from '../helpers/waitForEditable'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('bullet alignment', () => {
  // https://github.com/cybersemics/em/issues/5567
  it('bullet is vertically centered on the thought text, raised 1px for uppercase', async () => {
    // The misalignment grows with the font size and falls within subpixel rounding at the 16px default.
    await click('[data-testid=increase-font]') // 17
    await click('[data-testid=increase-font]') // 18

    await newThought('This is an empty thought')
    await page.waitForSelector('[aria-label="bullet-glyph"]')

    const { opticalCenter, bulletCenter } = await page.evaluate(() => {
      const editable = document.querySelector('[data-editable]')
      if (!editable) throw new Error('No editable found.')

      // The optical center of the text is the midpoint of its x-height band, which is the point that CSS
      // vertical-align: middle aligns an inline box to. A zero-height inline-block reports it exactly, whichever
      // font the platform substitutes for the thought text.
      const probe = document.createElement('span')
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:middle'
      editable.appendChild(probe)
      const opticalCenter = probe.getBoundingClientRect().top
      probe.remove()

      const glyph = document.querySelector('[aria-label="bullet-glyph"]')
      if (!glyph) throw new Error('No bullet glyph found.')
      const rect = glyph.getBoundingClientRect()

      return { opticalCenter, bulletCenter: rect.top + rect.height / 2 }
    })

    // the bullet sits 1px above the lowercase optical center to balance the uppercase letter most thoughts begin with,
    // up to subpixel rounding
    expect(Math.abs(opticalCenter - bulletCenter - 1)).toBeLessThan(0.1)
  })

  describe('mobile', () => {
    deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

    // https://github.com/cybersemics/em/issues/5980
    it('context view bullet stays inside the cursor highlight in Table View', async () => {
      await paste('- Aaa')
      await waitForEditable('Aaa')
      await clickThought('Aaa')
      await waitForSelector('[data-testid="bullet-cursor-overlay"]')

      await clickToolbar('Table View')
      await clickToolbar('Context View')
      await waitForSelector('::-p-text(This thought is not found in any other contexts.)')
      await waitForSelector('[aria-label="bullet"] [data-bullet="parent"]')
      await waitForBrowserSettled()

      const { bulletCenter, highlightCenter } = await page.evaluate(() => {
        const glyph = document.querySelector('[aria-label="bullet"] [data-bullet="parent"]')
        const highlight = document.querySelector('[data-testid="bullet-cursor-overlay"]')
        if (!glyph || !highlight) throw new Error('Bullet glyph or cursor highlight not found.')

        const glyphRect = glyph.getBoundingClientRect()
        const highlightRect = highlight.getBoundingClientRect()

        return {
          bulletCenter: glyphRect.left + glyphRect.width / 2,
          highlightCenter: highlightRect.left + highlightRect.width / 2,
        }
      })

      // the bullet is horizontally centered in the cursor highlight, up to subpixel rounding
      expect(Math.abs(bulletCenter - highlightCenter)).toBeLessThan(1)
    })
  })
})
