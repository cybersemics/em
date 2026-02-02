import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { setCursorActionCreator as setCursor } from '../../actions/setCursor'
import { executeCommand } from '../../commands'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import clearThoughtCommand from '../clearThought'

beforeEach(initStore)

/**
 * This has been moved to the top because the rest of the tests aren't getting cleaned up.
 * This should be properly fixed at some point.
 */
describe('clearThought', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  it('sets noteFocus to false when executing clearThought while noteFocus is true', async () => {
    await act(async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - =note
                - b
          `,
        }),
        setCursorFirstMatchActionCreator(['a']),
      ])
    })

    const { cursor } = store.getState()

    await act(async () => {
      store.dispatch([setCursor({ path: cursor, noteFocus: true })])
    })

    await act(vi.runOnlyPendingTimersAsync)

    // This ensures that the focus is on the note initially.
    const { noteFocus: initialNoteFocus } = store.getState()
    expect(initialNoteFocus).toBe(true)

    await act(async () => {
      executeCommand(clearThoughtCommand)
    })

    await act(vi.runOnlyPendingTimersAsync)

    // This ensures that the focus is no longer on the note.
    const { noteFocus } = store.getState()
    expect(noteFocus).toBe(false)
  })
})
