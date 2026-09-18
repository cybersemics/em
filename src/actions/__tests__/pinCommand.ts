import isUndoEnabled from '../../selectors/isUndoEnabled'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import pinCommand, { pinCommandActionCreator } from '../pinCommand'
import unpinCommand from '../unpinCommand'

it('pin a command and start a fresh progress record at the default target', () => {
  const stateNew = reducerFlow([pinCommand({ commandId: 'newThought' })])(initialState())

  expect(stateNew.learning).toEqual({
    pinnedCommandId: 'newThought',
    progress: { newThought: { reps: 0, targetReps: 5 } },
  })
})

it('replace the pinned command and erase the previous command’s reps', () => {
  const started = {
    ...initialState(),
    learning: { pinnedCommandId: 'newThought' as const, progress: { newThought: { reps: 2, targetReps: 5 } } },
  }
  const stateNew = reducerFlow([pinCommand({ commandId: 'indent' })])(started)

  expect(stateNew.learning).toEqual({
    pinnedCommandId: 'indent',
    progress: { indent: { reps: 0, targetReps: 5 } },
  })
})

it('pin the already pinned command and keep its reps', () => {
  const started = {
    ...initialState(),
    learning: { pinnedCommandId: 'newThought' as const, progress: { newThought: { reps: 2, targetReps: 5 } } },
  }
  const stateNew = reducerFlow([pinCommand({ commandId: 'newThought' })])(started)

  expect(stateNew.learning.progress.newThought).toEqual({ reps: 2, targetReps: 5 })
})

it('unpin erases the command’s reps', () => {
  const started = {
    ...initialState(),
    learning: { pinnedCommandId: 'newThought' as const, progress: { newThought: { reps: 2, targetReps: 5 } } },
  }
  const stateNew = reducerFlow([unpinCommand])(started)

  expect(stateNew.learning).toEqual({ pinnedCommandId: null, progress: {} })
})

describe('undo', () => {
  beforeEach(initStore)

  it('pinning does not add an undo step', () => {
    store.dispatch(pinCommandActionCreator({ commandId: 'newThought' }))

    expect(isUndoEnabled(store.getState())).toBe(false)
  })
})
