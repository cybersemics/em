import { importText } from '..'
import State from '../../@types/State'
import ThoughtspaceTransaction from '../../@types/ThoughtspaceTransaction'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import { getLexeme } from '../../selectors/getLexeme'
import initStore from '../../test-helpers/initStore'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import setDescendant from '../setDescendant'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('set', () => {
  const steps = [
    newThought('a'),
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          values: ['=test', 'hello'],
        },
        document,
      ),
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      - hello`)
})

it('last value should override existing value', () => {
  const steps = [
    newThought('a'),
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          values: ['=test', 'hello'],
        },
        document,
      ),
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          values: ['=test', 'goodbye'],
        },
        document,
      ),
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
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
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          values: ['=test', 'hello'],
        },
        document,
      ),
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          values: ['=test', 'goodbye'],
        },
        document,
      ),
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      - goodbye`)
})

it('noop if no values are given', () => {
  const stateStart = runDocumentCommand((state, document) => newThought(state, 'a', document), initialState())

  const steps = [
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          values: [],
        },
        document,
      ),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = runDocumentCommand(reducerFlow(steps), stateStart)

  expect(stateNew).toEqual(stateStart)
})

it('omit value to set only attribute', () => {
  const steps = [
    newThought('a'),
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          value: '=test',
        },
        document,
      ),
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test`)
})

it('preserve existing children when setting a nullary attribute', () => {
  const steps = [
    importText({
      text: `
      - a
        - b
        - c
    `,
    }),
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          value: '=test',
        },
        document,
      ),
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
    - b
    - c`)
})

it('set empty attribute', () => {
  const steps = [
    newThought('a'),
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          values: ['=test', ''],
        },
        document,
      ),
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      -${' '}`)
})

it('set multiple levels', () => {
  const steps = [
    newThought('a'),
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          values: ['w', 'x', 'y', 'z'],
        },
        document,
      ),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
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
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          values: ['w', 'x', 'y', 'z'],
        },
        document,
      ),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
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
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          values: ['w', 'x', 'y', 'z'],
        },
        document,
      ),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
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
    (state: State, document?: ThoughtspaceTransaction) =>
      setDescendant(
        state,
        {
          path: contextToPath(state, ['a'])!,
          values: ['w', 'x', 'y', 'z'],
        },
        document,
      ),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
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
