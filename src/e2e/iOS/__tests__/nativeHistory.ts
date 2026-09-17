/**
 * IOS Safari native undo/redo tests.
 * Uses WDIO test runner with Mocha framework.
 */
import getEditingText from '../helpers/getEditingText'
import newThought from '../helpers/newThought'
import threeFingerSwipe from '../helpers/threeFingerSwipe'
import waitForNativeHistoryStep from '../helpers/waitForNativeHistoryStep'
import waitForThoughts from '../helpers/waitForThoughts'

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

  // https://github.com/cybersemics/em/issues/5575
  it('a three-finger swipe right restores the only thought, removed by a three-finger swipe left', async () => {
    await newThought('hello')

    await threeFingerSwipe('l')
    await waitForThoughts([])

    await threeFingerSwipe('r')
    await waitForThoughts(['hello'])
  })

  // https://github.com/cybersemics/em/issues/5575
  it('a native undo still works after a three-finger undo and redo', async () => {
    await newThought('hello')

    // Wait out the history step em registers after each gesture, so that the step the shake below depends on is the
    // one registered by the redo rather than a leftover from the undo.
    await threeFingerSwipe('l')
    await waitForNativeHistoryStep()
    await waitForThoughts([])

    await threeFingerSwipe('r')
    await waitForNativeHistoryStep()
    await waitForThoughts(['hello'])

    // Shake reaches em only as a historyUndo beforeinput, which WebKit dispatches only while its own stack holds a
    // live step. The swipe re-renders the editable that step was recorded against, so unless a fresh one is
    // registered afterwards there is nothing to deliver and the shake does nothing. execCommand stands in for the
    // shake here because it depends on that same step, and a real device cannot be shaken in a cloud test lab.
    await browser.execute(() => document.execCommand('undo'))
    await waitForThoughts([])
  })
})
