/**
 * IOS Safari native undo/redo tests.
 * Uses WDIO test runner with Mocha framework.
 */
import { NATIVE_HISTORY_REGISTER_DELAY } from '../../../constants'
import getEditingText from '../helpers/getEditingText'
import getThoughts from '../helpers/getThoughts'
import newThought from '../helpers/newThought'
import threeFingerSwipe from '../helpers/threeFingerSwipe'

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
    await browser.waitUntil(async () => (await getThoughts()).length === 0, {
      timeoutMsg: 'the native undo gesture did not remove the thought',
    })

    await threeFingerSwipe('r')
    // The gesture is delivered asynchronously, so settle before asserting; a wait here would report its own
    // timeout instead of the thought that failed to come back.
    await browser.pause(2000)
    expect(await getThoughts()).toEqual(['hello'])
  })

  // https://github.com/cybersemics/em/issues/5575
  it('a native undo still works after a three-finger undo and redo', async () => {
    await newThought('hello')

    await threeFingerSwipe('l')
    await browser.waitUntil(async () => (await getThoughts()).length === 0, {
      timeoutMsg: 'the native undo gesture did not remove the thought',
    })

    await threeFingerSwipe('r')
    await browser.waitUntil(async () => (await getThoughts()).length === 1, {
      timeoutMsg: 'the native redo gesture did not restore the thought',
    })

    // Shake reaches em only as a historyUndo beforeinput, which WebKit dispatches only while its own stack holds a
    // live step. The swipe re-renders the editable that step was recorded against, so unless a fresh one is
    // registered afterwards there is nothing to deliver and the shake does nothing. execCommand stands in for the
    // shake here because it depends on that same step, and a real device cannot be shaken in a cloud test lab.
    // Wait out NATIVE_HISTORY_REGISTER_DELAY first, since registration is deferred past em's re-render.
    await browser.pause(NATIVE_HISTORY_REGISTER_DELAY + 1000)
    await browser.execute(() => document.execCommand('undo'))
    await browser.pause(1000)
    expect(await getThoughts()).toEqual([])
  })
})
