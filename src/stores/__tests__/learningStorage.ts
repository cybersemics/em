import initialState from '../../util/initialState'
import storage from '../../util/storage'
import storageModel from '../storageModel'

beforeEach(() => storageModel.remove('learning'))
afterEach(() => storageModel.remove('learning'))

it('restores a saved pin and captured practice target as part of initial state', () => {
  storageModel.set('learning', {
    pinnedCommandId: 'indent',
    progress: { indent: { reps: 2, targetReps: 8 } },
  })

  expect(initialState().learning).toEqual({
    pinnedCommandId: 'indent',
    progress: { indent: { reps: 2, targetReps: 8 } },
  })
})

it.each(['null', '[]', '{}', '{"progress":[]}'])('uses empty learning state for invalid saved data: %s', raw => {
  storage.setItem('learning', raw)

  expect(initialState().learning).toEqual({ pinnedCommandId: null, progress: {} })
})

it('recovers from invalid JSON and allows a subsequent save', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  storage.setItem('learning', '{invalid json')

  expect(initialState().learning).toEqual({ pinnedCommandId: null, progress: {} })
  storageModel.set('learning', { pinnedCommandId: 'indent', progress: { indent: { reps: 0, targetReps: 5 } } })
  expect(initialState().learning.pinnedCommandId).toBe('indent')
  warn.mockRestore()
})

it('drops invalid practice counts while preserving a valid record', () => {
  storage.setItem(
    'learning',
    JSON.stringify({
      pinnedCommandId: 'indent',
      progress: {
        indent: { reps: 2, targetReps: 5 },
        newThought: { reps: -1, targetReps: 5 },
        toggleDone: { reps: 1, targetReps: 0 },
        cursorUp: { reps: 0.5, targetReps: 5 },
        cursorDown: null,
      },
    }),
  )

  expect(initialState().learning).toEqual({
    pinnedCommandId: 'indent',
    progress: { indent: { reps: 2, targetReps: 5 } },
  })
})
