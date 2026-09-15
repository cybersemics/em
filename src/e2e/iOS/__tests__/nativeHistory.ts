/**
 * IOS Safari native undo/redo tests.
 * Uses WDIO test runner with Mocha framework.
 */
import getEditingText from '../helpers/getEditingText'
import newThought from '../helpers/newThought'

describe('Native history', () => {
  // https://github.com/cybersemics/em/issues/5575
  it('a native redo gesture restores the thought removed by a native undo gesture', async () => {
    await newThought('hello')
    await newThought('world')

    // Trigger native undo and redo the way the iOS three-finger swipe and shake-to-undo do. In real WebKit,
    // document.execCommand fires the same cancelable historyUndo/historyRedo beforeinput event as the native gesture,
    // and like the gesture it is only dispatched while WebKit's own history has a step in that direction.
    await browser.execute(() => document.execCommand('undo'))
    expect(await getEditingText()).toBe('hello')

    await browser.execute(() => document.execCommand('redo'))
    expect(await getEditingText()).toBe('world')
  })
})
