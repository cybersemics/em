import isUndoEnabled from '../../selectors/isUndoEnabled'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import pinCommand, { pinCommandActionCreator } from '../pinCommand'
import showPinnedCommandTooltip, { showPinnedCommandTooltipActionCreator } from '../showPinnedCommandTooltip'
import unpinCommand from '../unpinCommand'

it('open the tooltip of the pinned command', () => {
  const stateNew = reducerFlow([pinCommand({ commandId: 'newThought' }), showPinnedCommandTooltip({ value: true })])(
    initialState(),
  )

  expect(stateNew.showPinnedCommandTooltip).toBe(true)
})

it('do not open the tooltip while no command is pinned', () => {
  const stateNew = reducerFlow([showPinnedCommandTooltip({ value: true })])(initialState())

  expect(stateNew.showPinnedCommandTooltip).toBe(false)
})

it('close the tooltip when the command is unpinned', () => {
  const stateNew = reducerFlow([
    pinCommand({ commandId: 'newThought' }),
    showPinnedCommandTooltip({ value: true }),
    unpinCommand,
  ])(initialState())

  expect(stateNew.showPinnedCommandTooltip).toBe(false)
})

it('close the tooltip when a different command is pinned', () => {
  const stateNew = reducerFlow([
    pinCommand({ commandId: 'newThought' }),
    showPinnedCommandTooltip({ value: true }),
    pinCommand({ commandId: 'indent' }),
  ])(initialState())

  expect(stateNew.showPinnedCommandTooltip).toBe(false)
})

it('keep the tooltip open when the pinned command is pinned again', () => {
  const stateNew = reducerFlow([
    pinCommand({ commandId: 'newThought' }),
    showPinnedCommandTooltip({ value: true }),
    pinCommand({ commandId: 'newThought' }),
  ])(initialState())

  expect(stateNew.showPinnedCommandTooltip).toBe(true)
})

describe('undo', () => {
  beforeEach(initStore)

  it('opening the tooltip does not add an undo step', () => {
    store.dispatch([
      pinCommandActionCreator({ commandId: 'newThought' }),
      showPinnedCommandTooltipActionCreator({ value: true }),
    ])

    expect(store.getState().showPinnedCommandTooltip).toBe(true)
    expect(isUndoEnabled(store.getState())).toBe(false)
  })
})
