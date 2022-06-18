import reducerFlow from '../../util/reducerFlow'

it('compose reducers in order', () => {
  const initialState = { a: 0, b: 0 }
  expect(
    reducerFlow<typeof initialState>([state => ({ ...state, a: 1 }), state => ({ ...state, b: 2 })])(initialState),
  ).toEqual({ a: 1, b: 2 })
})

it('new state passed to next reducer', () => {
  const initialState = { a: 0, b: 0 }
  expect(
    reducerFlow<typeof initialState>([state => ({ ...state, a: 1 }), state => ({ ...state, b: state.a + 1 })])(
      initialState,
    ),
  ).toEqual({ a: 1, b: 2 })
})

it('initialState', () => {
  const initialState = { a: 0, b: 0, z: 0 }
  expect(
    reducerFlow<typeof initialState>([
      state => ({ ...state, a: 1 + state.z }),
      state => ({ ...state, b: 2 + state.z }),
    ])({ a: 0, b: 0, z: 100 }),
  ).toEqual({ a: 101, b: 102, z: 100 })
})

it('no initialState', () => {
  interface State {
    a: number
    b: number
    z: number
  }
  expect(
    reducerFlow<State>([
      state => ({ a: 0, b: 0, z: 100 }),
      state => ({ ...state, a: 1 + state.z }),
      state => ({ ...state, b: 2 + state.z }),
    ])(),
  ).toEqual({ a: 101, b: 102, z: 100 })
})
