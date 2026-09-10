import { importTextActionCreator as importText } from '../actions/importText'
import { initialize } from '../initialize'
import store from '../stores/app'
import initStore from '../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../test-helpers/setCursorFirstMatch'

beforeEach(initStore)

describe('initializeCursor', () => {
  it('restores the cursor from the URL when the user has not set one during initialization', async () => {
    expect(store.getState().cursorInitialized).toBe(false)

    await initialize({ storage: 'memory' })

    // the test URL has no thought path, so startup initializes the cursor to null
    expect(store.getState().cursor).toBeNull()
    expect(store.getState().cursorInitialized).toBe(true)
  })

  it('keeps a cursor the user set while the thoughtspace was still initializing', async () => {
    // the app is interactive before initialization finishes, so interact before awaiting it
    const initialized = initialize({ storage: 'memory' })
    store.dispatch([importText({ text: '- a\n- b' }), setCursor(['b'])])
    const cursor = store.getState().cursor
    expect(cursor).not.toBeNull()

    await initialized

    // startup must not overwrite the live cursor with the cursor decoded from the URL
    expect(store.getState().cursor).toEqual(cursor)
  })
})
