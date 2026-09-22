import * as outcomes from '../../actions/commandSucceeded'
import { executeCommandWithMulticursor } from '../../commands'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import toggleDone from '../toggleDone'

beforeEach(initStore)
afterEach(() => vi.restoreAllMocks())

it('reports the command and actual source for a completed user invocation', () => {
  const report = vi.spyOn(outcomes, 'commandSucceededActionCreator')
  executeCommandWithMulticursor(
    { ...toggleDone, canExecute: () => true, exec: () => {} },
    { store, type: 'gesture', userInitiated: true },
  )
  expect(report).toHaveBeenCalledExactlyOnceWith({ commandId: 'toggleDone', source: 'gesture', userInitiated: true })
})

it('waits for returned work and does not report rejected work', async () => {
  const report = vi.spyOn(outcomes, 'commandSucceededActionCreator')
  let finish!: () => void
  const pending = new Promise<void>(resolve => {
    finish = resolve
  })
  const execution = executeCommandWithMulticursor(
    { ...toggleDone, canExecute: () => true, exec: () => pending },
    { store, type: 'keyboard', userInitiated: true },
  )
  expect(report).not.toHaveBeenCalled()
  finish()
  await execution
  expect(report).toHaveBeenCalledOnce()
  await expect(
    executeCommandWithMulticursor(
      { ...toggleDone, canExecute: () => true, exec: () => Promise.reject(new Error('failed')) },
      { store, type: 'keyboard', userInitiated: true },
    ),
  ).rejects.toThrow('failed')
  expect(report).toHaveBeenCalledOnce()
})
