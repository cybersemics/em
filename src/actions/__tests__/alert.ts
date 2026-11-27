import alert, { alertActionCreator } from '../../actions/alert'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import alertMessage from '../../util/alertMessage'
import initialState from '../../util/initialState'

beforeEach(initStore)

it('returns the same state when the reducer receives an equal alertMessage value', () => {
  const state = alert({ value: alertMessage`Removed ${{ thought: 'a' }} from favorites` })(initialState())
  const stateNew = alert({ value: alertMessage`Removed ${{ thought: 'a' }} from favorites` })(state)
  expect(stateNew).toBe(state)
})

it('does not dispatch an alertMessage value equal to the current alert', () => {
  store.dispatch(alertActionCreator(alertMessage`Removed ${{ thought: 'a' }} from favorites`))
  const alertBefore = store.getState().alert

  store.dispatch(alertActionCreator(alertMessage`Removed ${{ thought: 'a' }} from favorites`))

  expect(store.getState().alert).toBe(alertBefore)
})

it('replaces the alert when the thought piece differs', () => {
  store.dispatch(alertActionCreator(alertMessage`Removed ${{ thought: 'a' }} from favorites`))
  store.dispatch(alertActionCreator(alertMessage`Removed ${{ thought: 'b' }} from favorites`))

  expect(store.getState().alert?.value).toEqual(['Removed ', { thought: 'b' }, ' from favorites'])
})
