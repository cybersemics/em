import { UnknownAction, applyMiddleware, createStore } from 'redux'
import { thunk } from 'redux-thunk'
import { CommandPatchMetadata } from '../../@types/Patch'
import State from '../../@types/State'
import doNotDispatchReducer from '../../redux-middleware/doNotDispatchReducer'
import multi from '../../redux-middleware/multi'
import commandTransaction from '../commandTransaction'
import initialState from '../initialState'

const metadata: CommandPatchMetadata = {
  source: 'command',
  invocationId: 'outer-command',
  commandId: 'indent',
  label: 'Indent',
  type: 'toolbar',
}

it('attributes real actions through arrays, nested transactions, and asynchronous thunks', async () => {
  const received: UnknownAction[] = []
  const store = createStore(
    (state = initialState(), action: UnknownAction) => {
      received.push(action)
      return state
    },
    applyMiddleware(doNotDispatchReducer, multi, thunk),
  )
  received.length = 0

  const result = store.dispatch(
    commandTransaction(metadata, dispatch =>
      dispatch<number | Promise<number>>([
        dispatch => {
          dispatch({ type: 'first' })
          return 7
        },
        async dispatch => {
          await Promise.resolve()
          return dispatch(
            commandTransaction({ ...metadata, invocationId: 'inner-command' }, nestedDispatch => {
              nestedDispatch({ type: 'second' })
              return 11
            }),
          )
        },
      ]),
    ),
  )

  expect(result[0]).toBe(7)
  expect(await result[1]).toBe(11)
  expect(received).toEqual([
    { type: 'first', commandMetadata: metadata },
    { type: 'second', commandMetadata: metadata },
  ])
})

it('preserves the middleware guard against dispatching a reducer', () => {
  const store = createStore((state = initialState()) => state, applyMiddleware(doNotDispatchReducer, multi, thunk))
  /** A reducer accidentally passed to the command's dispatch. */
  const reducer = (state: State, action: UnknownAction) => ({ ...state, cursorOffset: action.offset })

  expect(() =>
    store.dispatch(
      commandTransaction(metadata, dispatch =>
        // @ts-expect-error Deliberately dispatch a reducer to exercise the runtime guard.
        dispatch(reducer),
      ),
    ),
  ).toThrow('Dispatching a reducer is not allowed.')
})
