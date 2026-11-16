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
    const initial = await browser.execute(() => ({
      top: document.querySelector('[role="dialog"]')!.getBoundingClientRect().top,
      field: document.activeElement!.getAttribute('type'),
    }))
    expect(initial.field).toBe('email')

    await tap(await waitForElement('textarea'), { pointerType: 'touch' })
    const focused = await browser.execute(() => ({
      top: document.querySelector('[role="dialog"]')!.getBoundingClientRect().top,
      field: document.activeElement!.tagName,
    }))
    expect(focused.field).toBe('TEXTAREA')
    expect(Math.abs(focused.top - initial.top)).toBeLessThanOrEqual(1)
  })
})
