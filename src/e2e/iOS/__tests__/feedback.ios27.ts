import gesture from '../helpers/gesture'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import isKeyboardShown from '../helpers/isKeyboardShown'
import newThought from '../helpers/newThought'
import tap from '../helpers/tap'
import waitForElement from '../helpers/waitForElement'

describe('Feedback', () => {
  // https://github.com/cybersemics/em/pull/6073#issuecomment-6772525952
  it('keeps feedback above the keyboard after reopening Message', async () => {
    await newThought('Test feedback')
    await gesture('rdldr')
    await waitForElement('[role="dialog"][aria-labelledby="feedback-title"]')
    await browser.waitUntil(isKeyboardShown, { timeoutMsg: 'The feedback keyboard did not open.' })
    await hideKeyboardByTappingDone()
    await tap(await waitForElement('textarea'), { pointerType: 'touch' })
    await browser.waitUntil(isKeyboardShown, { timeoutMsg: 'The feedback keyboard did not reopen.' })

    const bounds = await browser.execute(() => {
      const form = document.querySelector('[role="dialog"]')!.getBoundingClientRect()
      return { top: form.top, bottom: form.bottom, viewportHeight: window.visualViewport!.height }
    })
    expect(bounds.top).toBeGreaterThanOrEqual(0)
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight)
    expect(bounds.viewportHeight - bounds.bottom).toBeLessThanOrEqual(32)
  })
})
