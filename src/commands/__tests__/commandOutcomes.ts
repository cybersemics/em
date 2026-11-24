import { discoverCommandActionCreator as discoverCommand } from '../../actions/discoverCommand'
import { errorActionCreator as error } from '../../actions/error'
import { commandEmitter, executeCommandWithMulticursor } from '../../commands'
import store from '../../stores/app'
import storageModel from '../../stores/storageModel'
import initStore from '../../test-helpers/initStore'
import toggleDone from '../toggleDone'

beforeEach(async () => {
  // Discoveries are saved, and would otherwise carry from one test into the next.
  storageModel.remove('learning')
  await initStore()
})
afterEach(() => vi.restoreAllMocks())

it('reports the command and actual source for a completed user invocation', () => {
  // A command the user already knows: the first use of an undiscovered command discovers it, which changes state.
  store.dispatch(discoverCommand({ commandId: 'toggleDone' }))
  const report = vi.spyOn(commandEmitter, 'trigger')
  const onStateChange = vi.fn()
  const unsubscribe = store.subscribe(onStateChange)
  executeCommandWithMulticursor({ ...toggleDone, canExecute: () => true, exec: () => {} }, { store, type: 'gesture' })
  expect(report).toHaveBeenCalledExactlyOnceWith('commandSucceeded', {
    commandId: 'toggleDone',
    source: 'gesture',
  })
  expect(onStateChange).not.toHaveBeenCalled()
  unsubscribe()
})

it('discovers an undiscovered command the first time the user performs it', () => {
  expect(store.getState().learning.discovered).not.toContain('toggleDone')
  executeCommandWithMulticursor({ ...toggleDone, canExecute: () => true, exec: () => {} }, { store, type: 'gesture' })
  expect(store.getState().learning.discovered).toContain('toggleDone')
})

it('reports an asynchronous command without waiting for its work to settle', () => {
  const report = vi.spyOn(commandEmitter, 'trigger')
  executeCommandWithMulticursor(
    { ...toggleDone, canExecute: () => true, exec: () => new Promise<void>(() => {}) },
    { store, type: 'keyboard' },
  )
  expect(report).toHaveBeenCalledOnce()
})

it('does not report a command that cannot execute', () => {
  const report = vi.spyOn(commandEmitter, 'trigger')
  executeCommandWithMulticursor({ ...toggleDone, canExecute: () => false, exec: () => {} }, { store, type: 'keyboard' })
  expect(report).not.toHaveBeenCalled()
})

it('does not report a command that raises an error', () => {
  const report = vi.spyOn(commandEmitter, 'trigger')
  executeCommandWithMulticursor(
    { ...toggleDone, canExecute: () => true, exec: dispatch => dispatch(error({ value: 'Read-only' })) },
    { store, type: 'keyboard' },
  )
  expect(report).not.toHaveBeenCalled()
})
