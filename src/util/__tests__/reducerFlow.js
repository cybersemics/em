import {
  reducerFlow,
} from '../../util'

it('compose reducers in order', () => {
  expect(reducerFlow([
    state => ({ a: 1 }),
    state => ({ b: 2 })
  ])())
    .toEqual({ a: 1, b: 2 })
})

it('new state passed to next reducer', () => {
  expect(reducerFlow([
    state => ({ a: 1 }),
    state => ({ b: state.a + 1 })
  ])())
    .toEqual({ a: 1, b: 2 })
})

it('initialState', () => {
  expect(reducerFlow([
    state => ({ a: 1 + state.z }),
    state => ({ b: 2 + state.z })
  ])({ z: 100 }))
    .toEqual({ a: 101, b: 102 })
})
