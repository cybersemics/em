import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import windowEvent from '../../test-helpers/windowEvent'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Presses a keyboard shortcut on the window, where the global keyDown handler picks it up and executes the matching command. */
const keyDown = async (key: string, { alt, meta }: { alt?: boolean; meta?: boolean } = {}) => {
  act(() => {
    windowEvent('keydown', { key, altKey: alt, metaKey: meta, bubbles: true })
  })
  await act(vi.runOnlyPendingTimersAsync)
}

describe('multicursor', () => {
  // https://github.com/cybersemics/em/issues/5148
  it('bolds every selected thought when only some of them are bold', async () => {
    act(() => {
      store.dispatch([
        importText({
          text: `
            - **a**
            - **b**
            - c
            - d
            - e
          `,
        }),
        setCursor(['c']),
      ])
    })
    await act(vi.runOnlyPendingTimersAsync)

    // Select All
    await keyDown('a', { meta: true, alt: true })
    // Bold
    await keyDown('b', { meta: true })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - **a**
  - **b**
  - **c**
  - **d**
  - **e**`)
  })

  // https://github.com/cybersemics/em/issues/5148
  it('bolds every selected thought when only some of them are bold and the cursor thought is bold', async () => {
    act(() => {
      store.dispatch([
        importText({
          text: `
            - **a**
            - **b**
            - c
            - d
            - e
          `,
        }),
        setCursor(['<b>a</b>']),
      ])
    })
    await act(vi.runOnlyPendingTimersAsync)

    // Select All
    await keyDown('a', { meta: true, alt: true })
    // Bold
    await keyDown('b', { meta: true })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - **a**
  - **b**
  - **c**
  - **d**
  - **e**`)
  })

  it('removes bold from every selected thought when all of them are bold', async () => {
    act(() => {
      store.dispatch([
        importText({
          text: `
            - **a**
            - **b**
            - **c**
          `,
        }),
        setCursor(['<b>a</b>']),
      ])
    })
    await act(vi.runOnlyPendingTimersAsync)

    // Select All
    await keyDown('a', { meta: true, alt: true })
    // Bold
    await keyDown('b', { meta: true })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b
  - c`)
  })
})
