/**
 * IOS Safari home navigation tests.
 * Uses WDIO test runner with Mocha framework.
 */
import $ from '../helpers/$'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'

// test succeeds individually, but fails when there are too many tests running in parallel
// https://github.com/cybersemics/em/issues/1475
// https://github.com/cybersemics/em/issues/1523

describe('Home', () => {
  it('click home link to set the cursor to null', async () => {
    const text = `
  - a
    - b`
    await paste(text)
    await waitForEditable('b')
    await clickThought('b') // set cursor
    await clickThought('b') // open keyboard

    const editingBefore = await $('[data-editing=true]')
    expect(editingBefore.elementId).toBeTruthy()

    const homeLink = await $('[data-testid=home] a')
    expect(homeLink).toBeTruthy()
    await homeLink.click()

    const editingAfter = await $('[data-editing=true]')
    expect(editingAfter.elementId).toBeFalsy()
  })
})
