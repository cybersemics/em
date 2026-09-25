import { importText } from '..'
import State from '../../@types/State'
import ThoughtspaceTransaction from '../../@types/ThoughtspaceTransaction'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import initStore from '../../test-helpers/initStore'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import toggleAttribute from '../toggleAttribute'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('toggle on', () => {
  const steps = [
    newThought('a'),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
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

it('toggle off', () => {
  const steps = [
    importText({
      text: `
        - a
          - =test
            - hello
      `,
    }),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
          values: ['=test', 'hello'],
        },
        document,
      ),
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('different value should override existing value', () => {
  const steps = [
    importText({
      text: `
        - a
          - =test
            - hello
      `,
    }),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
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
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
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

it('toggle nullary attribute on', () => {
  const steps = [
    newThought('a'),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
          values: ['=test'],
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

it('toggle nullary attribute off', () => {
  const steps = [
    newThought('a'),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
          values: ['=test'],
        },
        document,
      ),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
          values: ['=test'],
        },
        document,
      ),
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('preserve existing children when toggling a nullary attribute on', () => {
  const steps = [
    importText({
      text: `
      - a
        - b
        - c
    `,
    }),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
          values: ['=test'],
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

it('preserve existing children when toggling a nullary attribute off', () => {
  const steps = [
    importText({
      text: `
      - a
        - b
        - c
        - =test
    `,
    }),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
          values: ['=test'],
        },
        document,
      ),
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
    - c`)
})

it('toggle deep attribute on', () => {
  const steps = [
    newThought('a'),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
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

it('preserve other descendants when toggling deep attribute on', () => {
  const steps = [
    importText({
      text: `
      - a
        - w
          - x
            - m
    `,
    }),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
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

it('toggle deep attribute off', () => {
  const steps = [
    importText({
      text: `
      - a
        - w
          - x
            - y
              - z
    `,
    }),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
          values: ['w', 'x', 'y', 'z'],
        },
        document,
      ),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('preserve other descendants when toggling deep attribute off', () => {
  const steps = [
    importText({
      text: `
      - a
        - w
          - x
            - m
            - y
              - z
    `,
    }),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
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
        - m`)
})

it('preserve sorted context', () => {
  const steps = [
    importText({
      text: `
      - a
        - =sort
          - Alphabetical
    `,
    }),
    (state: State, document?: ThoughtspaceTransaction) =>
      toggleAttribute(
        state,
        {
          path: contextToPath(state, ['a']),
          values: ['=pin', 'true'],
        },
        document,
      ),
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =pin
    - =sort
      - Alphabetical`)
})
