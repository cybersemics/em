import { LEARNING_STARTER_COMMANDS } from '../../constants'
import store from '../../stores/app'
import storageModel from '../../stores/storageModel'
import initStore from '../../test-helpers/initStore'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import discoverCommand from '../discoverCommand'
import pinCommand from '../pinCommand'
import resetDiscoveredCommands, { resetDiscoveredCommandsActionCreator } from '../resetDiscoveredCommands'

it('forgets every discovered command except the starter commands', () => {
  const stateNew = reducerFlow([
    discoverCommand({ commandId: 'newSubthoughtTop' }),
    discoverCommand({ commandId: 'archive' }),
    resetDiscoveredCommands,
  ])(initialState())

  expect(stateNew.learning.discovered).toEqual([...LEARNING_STARTER_COMMANDS])
})

it('keeps the pinned command discovered, along with its practice progress', () => {
  const stateNew = reducerFlow([pinCommand({ commandId: 'archive' }), resetDiscoveredCommands])(initialState())

  expect(stateNew.learning.discovered).toEqual([...LEARNING_STARTER_COMMANDS, 'archive'])
  expect(stateNew.learning.progress.archive).toEqual({ reps: 0, targetReps: 5 })
})

it('saves the reset, so it lasts after a reload', async () => {
  storageModel.remove('learning')
  await initStore()
  store.dispatch({ type: 'discoverCommand', commandId: 'newSubthoughtTop' })

  store.dispatch(resetDiscoveredCommandsActionCreator())

  expect(storageModel.get('learning').discovered).toEqual([...LEARNING_STARTER_COMMANDS])
})
