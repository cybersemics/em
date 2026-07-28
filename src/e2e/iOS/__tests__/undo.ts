/**
 * IOS Safari native undo tests.
 * Uses WDIO test runner with Mocha framework.
 */
import newThought from '../helpers/newThought'

describe('Undo', () => {
  // https://github.com/cybersemics/em/issues/4476
  it('native undo undoes the last edit after the caret moves to another thought', async () => {
    await newThought('makre')
    await newThought('second')

    // The three-finger swipe and shake-to-undo gestures reach the page as a historyUndo beforeinput event,
    // which is what document.execCommand('undo') dispatches.
    await browser.execute(() => document.execCommand('undo'))
    await browser.pause(1000)

    const thoughts = await browser.execute(() =>
      Array.from(document.querySelectorAll('[data-editable]')).map(element => element.innerHTML),
    )
    expect(thoughts).toEqual(['makre'])
  })
})
