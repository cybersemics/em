import { commandEmitter, executeCommandWithMulticursor } from '../../commands'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import toggleDone from '../toggleDone'

beforeEach(initStore)
afterEach(() => vi.restoreAllMocks())

it('reports the command and actual source for a completed user invocation', () => {
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

it('waits for returned work and does not report rejected work', async () => {
  const report = vi.spyOn(commandEmitter, 'trigger')
  let finish!: () => void
  const pending = new Promise<void>(resolve => {
    finish = resolve
  })
  const execution = executeCommandWithMulticursor(
    { ...toggleDone, canExecute: () => true, exec: () => pending },
    { store, type: 'keyboard' },
  )
  expect(report).not.toHaveBeenCalled()
  finish()
  await execution
  expect(report).toHaveBeenCalledOnce()
  await expect(
    executeCommandWithMulticursor(
      { ...toggleDone, canExecute: () => true, exec: () => Promise.reject(new Error('failed')) },
      { store, type: 'keyboard' },
    ),
  ).rejects.toThrow('failed')
  expect(report).toHaveBeenCalledOnce()
})
