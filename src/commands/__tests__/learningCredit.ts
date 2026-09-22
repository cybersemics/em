import { errorActionCreator as error } from '../../actions/error'
import { pinCommandActionCreator as pinCommand } from '../../actions/pinCommand'
import { unpinCommandActionCreator as unpinCommand } from '../../actions/unpinCommand'
import { executeCommandWithMulticursor } from '../../commands'
import store from '../../stores/app'
import storageModel from '../../stores/storageModel'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import importToContext from '../../test-helpers/importToContext'
import initStore from '../../test-helpers/initStore'
import requestAiDisclosure, {
  acceptAiDisclosure,
  cancelAiDisclosure,
  clearAiDisclosureAcknowledgement,
} from '../../util/aiDisclosure'
import storage from '../../util/storage'
import toggleDoneCommand from '../toggleDone'

const runnableCommand = { ...toggleDoneCommand, canExecute: () => true }

beforeEach(async () => {
  clearAiDisclosureAcknowledgement()
  storage.removeItem('learning')
  await initStore()
})

afterEach(clearAiDisclosureAcknowledgement)

it('awards and persists one rep for a successful keyboard invocation', () => {
  store.dispatch(pinCommand({ commandId: 'toggleDone' }))
  const command = { ...runnableCommand, exec: vi.fn() }

  executeCommandWithMulticursor(command, { store, type: 'keyboard', userInitiated: true })

  expect(command.exec).toHaveBeenCalledOnce()
  expect(store.getState().learning.progress.toggleDone?.reps).toBe(1)
  expect(storageModel.get('learning')?.progress.toggleDone?.reps).toBe(1)
})

it('does not award a rep for non-execution, internal invocation, toolbar, or an error', () => {
  store.dispatch(pinCommand({ commandId: 'toggleDone' }))
  const command = { ...runnableCommand, exec: vi.fn() }

  executeCommandWithMulticursor({ ...command, canExecute: () => false }, { store, userInitiated: true })
  executeCommandWithMulticursor(command, { store, type: 'keyboard' })
  executeCommandWithMulticursor(command, { store, type: 'toolbar', userInitiated: true })
  executeCommandWithMulticursor(
    { ...command, exec: dispatch => dispatch(error({ value: 'Command failed' })) },
    { store, type: 'gesture', userInitiated: true },
  )

  expect(store.getState().learning.progress.toggleDone?.reps).toBe(0)
})

it('waits for returned asynchronous work and ignores a rejected invocation', async () => {
  store.dispatch(pinCommand({ commandId: 'toggleDone' }))
  let complete!: () => void
  const pending = new Promise<void>(resolve => {
    complete = resolve
  })

  const execution = executeCommandWithMulticursor(
    { ...runnableCommand, exec: () => pending },
    { store, type: 'gesture', userInitiated: true },
  )
  expect(store.getState().learning.progress.toggleDone?.reps).toBe(0)

  complete()
  await execution
  expect(store.getState().learning.progress.toggleDone?.reps).toBe(1)

  await expect(
    executeCommandWithMulticursor(
      { ...runnableCommand, exec: async () => Promise.reject(new Error('Command failed')) },
      { store, type: 'gesture', userInitiated: true },
    ),
  ).rejects.toThrow('Command failed')
  expect(store.getState().learning.progress.toggleDone?.reps).toBe(1)
})

it('waits through first-use AI disclosure and awards nothing when it is canceled', async () => {
  store.dispatch(pinCommand({ commandId: 'toggleDone' }))
  const command = {
    ...runnableCommand,
    exec: () => requestAiDisclosure(async () => undefined) ?? undefined,
  }

  const canceled = executeCommandWithMulticursor(command, { store, type: 'gesture', userInitiated: true })
  expect(store.getState().learning.progress.toggleDone?.reps).toBe(0)
  cancelAiDisclosure()
  await canceled
  expect(store.getState().learning.progress.toggleDone?.reps).toBe(0)

  const accepted = executeCommandWithMulticursor(command, { store, type: 'gesture', userInitiated: true })
  expect(store.getState().learning.progress.toggleDone?.reps).toBe(0)
  acceptAiDisclosure({ remember: false })?.()
  await accepted
  expect(store.getState().learning.progress.toggleDone?.reps).toBe(1)
})

it('settles a disclosure invocation replaced by another command', async () => {
  store.dispatch(pinCommand({ commandId: 'toggleDone' }))
  const command = {
    ...runnableCommand,
    exec: () => requestAiDisclosure(async () => undefined) ?? undefined,
  }

  const first = executeCommandWithMulticursor(command, { store, type: 'gesture', userInitiated: true })
  const second = executeCommandWithMulticursor(command, { store, type: 'gesture', userInitiated: true })
  await first
  expect(store.getState().learning.progress.toggleDone?.reps).toBe(0)

  acceptAiDisclosure({ remember: false })?.()
  await second
  expect(store.getState().learning.progress.toggleDone?.reps).toBe(1)
})

it('awards one rep for the whole multicursor invocation', async () => {
  store.dispatch(pinCommand({ commandId: 'toggleDone' }))
  store.dispatch(importToContext('- a\n- b'))
  store.dispatch(addMulticursor(['a']))
  store.dispatch(addMulticursor(['b']))
  const command = { ...runnableCommand, exec: vi.fn() }

  await executeCommandWithMulticursor(command, { store, type: 'keyboard', userInitiated: true })

  expect(command.exec).toHaveBeenCalledTimes(2)
  expect(store.getState().learning.progress.toggleDone?.reps).toBe(1)
})

it('keeps counting reps past the target, and unpinning erases them', () => {
  store.dispatch(pinCommand({ commandId: 'toggleDone' }))
  const command = { ...runnableCommand, exec: vi.fn() }
  Array.from({ length: 6 }).forEach(() =>
    executeCommandWithMulticursor(command, { store, type: 'keyboard', userInitiated: true }),
  )

  expect(store.getState().learning.progress.toggleDone).toEqual({ reps: 6, targetReps: 5 })

  store.dispatch(unpinCommand())

  expect(store.getState().learning).toEqual({ pinnedCommandId: null, progress: {} })
  expect(storageModel.get('learning')).toEqual(store.getState().learning)
})

it('restores the saved pin and reps when Redux initializes', async () => {
  store.dispatch(pinCommand({ commandId: 'toggleDone' }))
  executeCommandWithMulticursor({ ...runnableCommand, exec: vi.fn() }, { store, type: 'keyboard', userInitiated: true })
  const saved = storageModel.get('learning')
  if (!saved) throw new Error('Expected saved learning progress.')
  expect(saved.progress.toggleDone?.reps).toBe(1)

  await initStore()
  expect(store.getState().learning.pinnedCommandId).toBe('toggleDone')
  expect(store.getState().learning.progress.toggleDone?.reps).toBe(1)
})
