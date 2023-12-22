import { importText } from '..'
import State from '../../@types/State'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import { getLexeme } from '../../selectors/getLexeme'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import setDescendant from '../setDescendant'

it('set', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        values: ['=test', 'hello'],
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      - hello`)
})

it('last value should override existing value', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        values: ['=test', 'hello'],
      }),
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        values: ['=test', 'goodbye'],
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      - goodbye`)
})

it('add attribute if key has already been created', () => {
  const steps = [
    newThought('a'),
    newSubthought('=test'),
    setCursor(['a']),
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        values: ['=test', 'hello'],
      }),
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        values: ['=test', 'goodbye'],
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      - goodbye`)
})

it('noop if no values are given', () => {
  const stateStart = newThought(initialState(), 'a')

  const steps = [
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        values: [],
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(stateStart)

  expect(stateNew).toEqual(stateStart)
})

it('omit value to set only attribute', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        value: '=test',
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test`)
})

it('set empty attribute', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        values: ['=test', ''],
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      -${' '}`)
})

it('set multiple levels', () => {
  const steps = [
    newThought('a'),
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        values: ['w', 'x', 'y', 'z'],
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - w
      - x
        - y
          - z`)
})

it('preserve unrelated siblings', () => {
  const steps = [
    importText({
      text: `
      - a
        - m
    `,
    }),
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        values: ['w', 'x', 'y', 'z'],
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - w
      - x
        - y
          - z
    - m`)
})

it('preserve existing descendants', () => {
  const steps = [
    importText({
      text: `
      - a
        - w
          - x
    `,
    }),
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        values: ['w', 'x', 'y', 'z'],
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - w
      - x
        - y
          - z`)

  const lexemeW = getLexeme(stateNew, 'w')!
  expect(lexemeW.contexts).toHaveLength(1)

  const lexemeX = getLexeme(stateNew, 'x')!
  expect(lexemeX.contexts).toHaveLength(1)
})

it('preserve unrelated descendants', () => {
  const steps = [
    importText({
      text: `
      - a
        - m
        - w
          - n
          - x
            - o
    `,
    }),
    (state: State) =>
      setDescendant(state, {
        path: contextToPath(state, ['a'])!,
        values: ['w', 'x', 'y', 'z'],
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
    - w
      - n
      - x
        - y
          - z
        - o`)
})
