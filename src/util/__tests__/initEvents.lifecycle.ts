import { desktopCommandUniverseActionCreator as desktopCommandUniverse } from '../../actions/desktopCommandUniverse'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import initEvents from '../initEvents'

const stateChangeListenerRef = vi.hoisted(
  () =>
    ({
      current: null as
        | null
        | ((event: { oldState: 'active' | 'passive' | 'hidden'; newState: 'active' | 'passive' | 'hidden' }) => void),
    }) as {
      current:
        | null
        | ((event: { oldState: 'active' | 'passive' | 'hidden'; newState: 'active' | 'passive' | 'hidden' }) => void)
    },
)

vi.mock('page-lifecycle', () => ({
  default: {
    addEventListener: vi.fn((eventName: string, listener: typeof stateChangeListenerRef.current) => {
      if (eventName === 'statechange') {
        stateChangeListenerRef.current = listener
      }
    }),
    removeEventListener: vi.fn((eventName: string, listener: typeof stateChangeListenerRef.current) => {
      if (eventName === 'statechange' && stateChangeListenerRef.current === listener) {
        stateChangeListenerRef.current = null
      }
    }),
  },
}))

beforeEach(async () => {
  await initStore()
})

afterEach(() => {
  initEvents(store).cleanup()
})

// https://github.com/cybersemics/em/issues/1596
it('keeps desktop command universe open when the app is hidden and restored', () => {
  initEvents(store)

  store.dispatch(desktopCommandUniverse())
  expect(store.getState().showDesktopCommandUniverse).toBe(true)
  expect(stateChangeListenerRef.current).toBeTruthy()

  stateChangeListenerRef.current!({
    oldState: 'active',
    newState: 'hidden',
  })
  stateChangeListenerRef.current!({
    oldState: 'hidden',
    newState: 'active',
  })

  expect(store.getState().showDesktopCommandUniverse).toBe(true)
})
