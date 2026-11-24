import { GestureResponderEvent } from 'react-native'
import { gestureMenuActionCreator as gestureMenu } from '../../actions/gestureMenu'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { commandById, discoverFromGestureMenu, handleGestureEnd } from '../../commands'
import store from '../../stores/app'
import storageModel from '../../stores/storageModel'
import initStore from '../../test-helpers/initStore'

/** The gesture of New Subthought (above), which is not a starter command and so starts undiscovered. */
const UNDISCOVERED_GESTURE = 'rdu'
const event = {} as GestureResponderEvent

beforeEach(async () => {
  storageModel.remove('learning')
  await initStore()
  store.dispatch(newThought({ value: 'a' }))
})

/** The number of thoughts in the thoughtspace, which New Subthought (above) would add to. */
const thoughtCount = () => Object.keys(store.getState().thoughts.thoughtIndex).length

it('releasing on an undiscovered command in the open Gesture Menu cancels, without performing or discovering it', () => {
  store.dispatch(gestureMenu())
  const before = thoughtCount()

  handleGestureEnd({ sequence: UNDISCOVERED_GESTURE, e: event })

  expect(store.getState().commandDiscovery).toBe(null)
  expect(store.getState().learning.discovered).not.toContain('newSubthoughtTop')
  expect(store.getState().showGestureMenu).toBe(false)
  expect(thoughtCount()).toBe(before)
})

it('holding still on the undiscovered command until it is charged discovers it and closes the Gesture Menu', () => {
  store.dispatch(gestureMenu())
  const before = thoughtCount()

  discoverFromGestureMenu(commandById('newSubthoughtTop'))

  expect(store.getState().commandDiscovery).toBe('newSubthoughtTop')
  expect(store.getState().learning.discovered).toContain('newSubthoughtTop')
  expect(store.getState().showGestureMenu).toBe(false)
  expect(thoughtCount()).toBe(before)
})

it('releasing after the hold has discovered the command does not perform it', () => {
  store.dispatch(gestureMenu())
  discoverFromGestureMenu(commandById('newSubthoughtTop'))
  const before = thoughtCount()

  handleGestureEnd({ sequence: UNDISCOVERED_GESTURE, e: event })

  expect(store.getState().commandDiscovery).toBe('newSubthoughtTop')
  expect(thoughtCount()).toBe(before)
})

it('a gesture released before the Gesture Menu opens is performed, and discovers its command', () => {
  const before = thoughtCount()

  handleGestureEnd({ sequence: UNDISCOVERED_GESTURE, e: event })

  expect(store.getState().commandDiscovery).toBe(null)
  expect(store.getState().learning.discovered).toContain('newSubthoughtTop')
  expect(thoughtCount()).toBe(before + 1)
})

it('releasing on a discovered command in the open Gesture Menu performs it', () => {
  handleGestureEnd({ sequence: UNDISCOVERED_GESTURE, e: event })
  store.dispatch(gestureMenu())
  const before = thoughtCount()

  handleGestureEnd({ sequence: UNDISCOVERED_GESTURE, e: event })

  expect(store.getState().commandDiscovery).toBe(null)
  expect(thoughtCount()).toBe(before + 1)
})
