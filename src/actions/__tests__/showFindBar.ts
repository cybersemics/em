import isUndoEnabled from '../../selectors/isUndoEnabled'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import showFindBar, { showFindBarActionCreator } from '../showFindBar'

it('open the find bar', () => {
  const stateNew = reducerFlow([showFindBar({ value: true })])(initialState())

  expect(stateNew.showFindBar).toBe(true)
})

it('close the find bar', () => {
  const stateNew = reducerFlow([showFindBar({ value: true }), showFindBar({ value: false })])(initialState())

  expect(stateNew.showFindBar).toBe(false)
})

describe('undo', () => {
  beforeEach(initStore)

  it('opening the find bar does not add an undo step', () => {
    store.dispatch(showFindBarActionCreator({ value: true }))

    expect(store.getState().showFindBar).toBe(true)
    expect(isUndoEnabled(store.getState())).toBe(false)
  })
})
