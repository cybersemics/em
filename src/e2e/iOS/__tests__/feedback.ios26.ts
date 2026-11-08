import gesture from '../helpers/gesture'
import isKeyboardShown from '../helpers/isKeyboardShown'
import tap from '../helpers/tap'
import waitForElement from '../helpers/waitForElement'

describe('Feedback', () => {
  // https://github.com/cybersemics/em/pull/6073#issuecomment-6593305605
  it('keeps feedback in place when moving from Email to Message', async () => {
    await gesture('rdldr')
    await waitForElement('[role="dialog"][aria-labelledby="feedback-title"]')
    await browser.waitUntil(isKeyboardShown, { timeoutMsg: 'The feedback keyboard did not open.' })
    await tap(await waitForElement('input[type="email"]'), { pointerType: 'touch' })
    const top = await browser.execute(() => document.querySelector('[role="dialog"]')!.getBoundingClientRect().top)

    await tap(await waitForElement('textarea'), { pointerType: 'touch' })
    const focused = await browser.execute(() => ({
      top: document.querySelector('[role="dialog"]')!.getBoundingClientRect().top,
      field: document.activeElement!.tagName,
    }))
    expect(focused.field).toBe('TEXTAREA')
    expect(Math.abs(focused.top - top)).toBeLessThanOrEqual(1)
  })
})
