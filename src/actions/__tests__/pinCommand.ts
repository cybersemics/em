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

it('replace the pinned command and keep the previous command’s progress', () => {
  const stateNew = reducerFlow([pinCommand({ commandId: 'newThought' }), pinCommand({ commandId: 'indent' })])(
    initialState(),
  )

  expect(stateNew.learning).toEqual({
    pinnedCommandId: 'indent',
    progress: {
      newThought: { reps: 0, targetReps: 5 },
      indent: { reps: 0, targetReps: 5 },
    },
  })
})

it('repin a command without resetting its existing progress record', () => {
  const started = {
    ...initialState(),
    learning: { pinnedCommandId: null, progress: { newThought: { reps: 2, targetReps: 5 } } },
  }
  const stateNew = reducerFlow([pinCommand({ commandId: 'indent' }), pinCommand({ commandId: 'newThought' })])(started)

  expect(stateNew.learning.pinnedCommandId).toBe('newThought')
  expect(stateNew.learning.progress.newThought).toEqual({ reps: 2, targetReps: 5 })
})

it('unpin keeps every progress record', () => {
  const stateNew = reducerFlow([pinCommand({ commandId: 'newThought' }), unpinCommand])(initialState())

  expect(stateNew.learning).toEqual({
    pinnedCommandId: null,
    progress: { newThought: { reps: 0, targetReps: 5 } },
  })
})

describe('undo', () => {
  beforeEach(initStore)

  it('pinning does not add an undo step', () => {
    store.dispatch(pinCommandActionCreator({ commandId: 'newThought' }))

    expect(isUndoEnabled(store.getState())).toBe(false)
  })
})
