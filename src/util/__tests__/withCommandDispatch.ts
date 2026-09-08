import { UnknownAction, applyMiddleware, createStore } from 'redux'
import { thunk } from 'redux-thunk'
import { CommandPatchMetadata } from '../../@types/Patch'
import State from '../../@types/State'
import doNotDispatchReducer from '../../redux-middleware/doNotDispatchReducer'
import multi from '../../redux-middleware/multi'
import initialState from '../initialState'
import withCommandDispatch from '../withCommandDispatch'

const metadata: CommandPatchMetadata = {
  source: 'command',
  invocationId: 'test-command',
  commandId: 'indent',
  label: 'Indent',
  type: 'toolbar',
}

it('preserves array order and synchronous and asynchronous thunk return values', async () => {
  const received: UnknownAction[] = []
  const store = createStore(
    (state = initialState(), action: UnknownAction) => {
      received.push(action)
      return state
    },
    applyMiddleware(doNotDispatchReducer, multi, thunk),
  )
  received.length = 0

  const result = withCommandDispatch(store.dispatch, metadata, dispatch =>
    dispatch<number | Promise<number>>([
      dispatch => {
        dispatch({ type: 'first' })
        return 7
      },
      async dispatch => {
        await Promise.resolve()
        dispatch({ type: 'second' })
        return 11
      },
    ]),
  )

  expect(result[0]).toBe(7)
  expect(await result[1]).toBe(11)
  expect(received).toEqual([
    { type: 'beginCommand', metadata },
    { type: 'first' },
    { type: 'endCommand' },
    { type: 'beginCommand', metadata },
    { type: 'second' },
    { type: 'endCommand' },
  ])
})

it('preserves the middleware guard against dispatching a reducer', () => {
  const store = createStore((state = initialState()) => state, applyMiddleware(doNotDispatchReducer, multi, thunk))
  /** A reducer accidentally passed to the command's dispatch. */
  const reducer = (state: State, action: UnknownAction) => ({ ...state, cursorOffset: action.offset })

  expect(() =>
    withCommandDispatch(store.dispatch, metadata, dispatch =>
      // @ts-expect-error Deliberately dispatch a reducer to exercise the runtime guard.
      dispatch(reducer),
    ),
  ).toThrow('Dispatching a reducer is not allowed.')
})

it('propagates asynchronous failures after closing the synchronous boundary', async () => {
  const received: string[] = []
  const store = createStore(
    (state = initialState(), action: UnknownAction) => {
      received.push(action.type)
      return state
    },
    applyMiddleware(multi, thunk),
  )
  received.length = 0
  const failure = new Error('Request failed')

  const result = withCommandDispatch(store.dispatch, metadata, dispatch =>
    dispatch(async () => {
      await Promise.resolve()
      throw failure
    }),
  )

  expect(received).toEqual(['beginCommand', 'endCommand'])
  await expect(result).rejects.toBe(failure)
})
