import { WindowEm } from '../../../initialize'
import newThought from '../helpers/newThought'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('space-to-indent', () => {
  // https://github.com/cybersemics/em/issues/4178
  it('indents an empty thought when Android delivers space as a beforeinput insertText', async () => {
    // create thought A, then a new empty thought below it
    await newThought('A')
    await press('Enter')
    await waitForEditable('')

    // On Android the soft keyboard reports the space keydown as keyCode 229 ('Unidentified'), so the space
    // never matches the indent command in keyDown — it arrives only as a `beforeinput` insertText. Simulate
    // that native delivery directly on the focused editable (the window `beforeinput` listener handles it).
    await page.evaluate(() => {
      document.activeElement?.dispatchEvent(
        new InputEvent('beforeinput', { inputType: 'insertText', data: ' ', bubbles: true, cancelable: true }),
      )
    })

    // the empty thought should be indented as a subthought of A (its previous sibling), not left as a
    // sibling containing a literal space
    const childCount = await page.evaluate(async () => {
      const em = window.em as WindowEm
      for (let i = 0; i < 20; i++) {
        if (em.getAllChildrenAsThoughts(['A']).length > 0) break
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      return em.getAllChildrenAsThoughts(['A']).length
    })
    expect(childCount).toBe(1)
  })
})
