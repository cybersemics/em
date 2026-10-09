import click from '../helpers/click'
import newThought from '../helpers/newThought'
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
})
