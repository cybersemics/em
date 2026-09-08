import { UnknownAction, applyMiddleware, createStore } from 'redux'
import { thunk } from 'redux-thunk'
import { CommandPatchMetadata } from '../../@types/Patch'
import State from '../../@types/State'
// Register the real action classifications; the reducer below isolates the history mechanism from thought creation.
import '../../actions/newThought'
import '../../actions/setCursor'
import multi from '../../redux-middleware/multi'
import initialState from '../../util/initialState'
import withCommandDispatch from '../../util/withCommandDispatch'
import undoRedoEnhancer from '../undoRedoEnhancer'

const initial = initialState()
const metadata: CommandPatchMetadata = {
  source: 'command',
  invocationId: 'outer-command',
  commandId: 'newSubthought',
  label: 'New Subthought',
  type: 'keyboard',
  keyboardIndex: 0,
}

/** A deterministic reducer isolates enhancer grouping and replay from command effects and generated thought ids. */
const reducer = (state: State = initial, action: UnknownAction): State =>
  typeof action.offset === 'number' ? { ...state, cursorOffset: action.offset } : state

it('replays nested command boundaries with identical patch metadata and action types', () => {
  const actions: UnknownAction[] = []
  const live = applyMiddleware(multi, thunk, () => next => action => {
    actions.push(action as UnknownAction)
    return next(action)
  })(undoRedoEnhancer(createStore))(reducer)

  withCommandDispatch(live.dispatch, metadata, dispatch => {
    dispatch({ type: 'newThought', offset: 1 })
    withCommandDispatch(
      dispatch,
      { ...metadata, invocationId: 'inner-command', commandId: 'indent' },
      nestedDispatch => {
        nestedDispatch({ type: 'setCursor', offset: 2 })
      },
    )
    dispatch({ type: 'newThought', offset: 3 })
  })

  const replay = createStore(reducer, undoRedoEnhancer)
  // Replay serialized plain actions, without executing commands or calling a metadata setter.
  const recordedActions = JSON.parse(JSON.stringify(actions)) as UnknownAction[]
  recordedActions.forEach(action => replay.dispatch(action))

  expect(live.getState().undoPatches).toEqual([
    {
      ops: [{ op: 'replace', path: '/cursorOffset', value: initial.cursorOffset }],
      metadata: { ...metadata, actionTypes: ['newThought', 'setCursor'], isNavigation: false },
    },
  ])
  expect(replay.getState()).toEqual(live.getState())
})

it('restores the enclosing group after a nested exception and closes it before the next action', () => {
  const store = applyMiddleware(multi, thunk)(undoRedoEnhancer(createStore))(reducer)
  const failure = new Error('Command failed')

  withCommandDispatch(store.dispatch, metadata, dispatch => {
    dispatch({ type: 'newThought', offset: 1 })
    expect(() =>
      withCommandDispatch(dispatch, { ...metadata, invocationId: 'inner-command' }, nestedDispatch => {
        nestedDispatch({ type: 'newThought', offset: 2 })
        throw failure
      }),
    ).toThrow(failure)
    dispatch({ type: 'newThought', offset: 3 })
  })
  store.dispatch({ type: 'newThought', offset: 4 })

  expect(store.getState().undoPatches).toEqual([
    {
      ops: [{ op: 'replace', path: '/cursorOffset', value: initial.cursorOffset }],
      metadata: { ...metadata, actionTypes: ['newThought'], isNavigation: false },
    },
    {
      ops: [{ op: 'replace', path: '/cursorOffset', value: 3 }],
      metadata: { source: 'action', actionTypes: ['newThought'], isNavigation: false },
    },
  ])
})

it('groups contiguous asynchronous results without absorbing an intervening independent action', async () => {
  const store = applyMiddleware(multi, thunk)(undoRedoEnhancer(createStore))(reducer)
  let resolve!: () => void
  const pending = new Promise<void>(done => {
    resolve = done
  })

  const result = withCommandDispatch(store.dispatch, metadata, async dispatch => {
    dispatch({ type: 'newThought', offset: 1 })
    await pending
    dispatch({ type: 'newThought', offset: 3 })
    dispatch({ type: 'setCursor', offset: 4 })
  })
  store.dispatch({ type: 'newThought', offset: 2 })
  resolve()
  await result

  expect(store.getState().undoPatches).toEqual([
    {
      ops: [{ op: 'replace', path: '/cursorOffset', value: initial.cursorOffset }],
      metadata: { ...metadata, actionTypes: ['newThought'], isNavigation: false },
    },
    {
      ops: [{ op: 'replace', path: '/cursorOffset', value: 1 }],
      metadata: { source: 'action', actionTypes: ['newThought'], isNavigation: false },
    },
    {
      ops: [{ op: 'replace', path: '/cursorOffset', value: 2 }],
      metadata: { ...metadata, actionTypes: ['newThought', 'setCursor'], isNavigation: false },
    },
  ])
})

it('retains the enclosing invocation when nested asynchronous work resumes', async () => {
  const store = applyMiddleware(multi, thunk)(undoRedoEnhancer(createStore))(reducer)

  await withCommandDispatch(store.dispatch, metadata, dispatch =>
    withCommandDispatch(
      dispatch,
      { ...metadata, invocationId: 'inner-command', commandId: 'indent' },
      async nestedDispatch => {
        await Promise.resolve()
        nestedDispatch({ type: 'newThought', offset: 1 })
      },
    ),
  )

  expect(store.getState().undoPatches).toEqual([
    {
      ops: [{ op: 'replace', path: '/cursorOffset', value: initial.cursorOffset }],
      metadata: { ...metadata, actionTypes: ['newThought'], isNavigation: false },
    },
  ])
})
