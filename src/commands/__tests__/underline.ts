import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import windowEvent from '../../test-helpers/windowEvent'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Presses a keyboard shortcut on the window, where the global keyDown handler picks it up and executes the matching command. */
const keyDown = async (key: string, { meta }: { meta?: boolean } = {}) => {
  act(() => {
    windowEvent('keydown', { key, metaKey: meta, bubbles: true })
  })
  await act(vi.runOnlyPendingTimersAsync)
}

describe('multicursor', () => {
  // https://github.com/cybersemics/em/issues/6398
  it('keeps the cursor where it was after underlining the selected thoughts', async () => {
    act(() => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
          `,
        }),
        setCursor(['a']),
        addMulticursor(['b']),
        addMulticursor(['c']),
      ])
    })
    await act(vi.runOnlyPendingTimersAsync)

    const { cursor: cursorBefore, multicursors: multicursorsBefore } = store.getState()

    await keyDown('u', { meta: true })

    const state = store.getState()

    expect(exportContext(state, [HOME_TOKEN], 'text/html')).toBe(`<ul>
  <li>${HOME_TOKEN}  
    <ul>
      <li>a</li>
      <li><u>b</u></li>
      <li><u>c</u></li>
    </ul>
  </li>
</ul>`)
    expect(state.multicursors).toEqual(multicursorsBefore)
    expect(state.cursor).toEqual(cursorBefore)
  })
})
