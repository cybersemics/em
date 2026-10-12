import importText from '../../actions/importText'
import swapNote from '../../actions/swapNote'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import reducerFlow from '../../test-helpers/reducerFlow'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

// https://github.com/cybersemics/em/pull/5722
it('preserves a home-context path note and alerts on repeated swaps', () => {
  const state = reducerFlow([
    importText({
      text: `
        - Reify
          - =note
            - =path
              - names
          - Names
            - Bind Thought
            - Canonize`,
    }),
    setCursor(['Reify']),
  ])(initialState())

  const stateNew = swapNote(state)

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reify
    - =note
      - =path
        - names
    - Names
      - Bind Thought
      - Canonize`)
  expect(stateNew.alert?.value).toBe('Thoughts in the home context cannot be converted to a note.')
  expectPathToEqual(stateNew, stateNew.cursor, ['Reify'])

  const stateRepeated = swapNote(stateNew)

  expect(stateRepeated.thoughts).toEqual(state.thoughts)
  expect(stateRepeated.alert?.value).toBe('Thoughts in the home context cannot be converted to a note.')
  expectPathToEqual(stateRepeated, stateRepeated.cursor, ['Reify'])
})

it('preserves a nested path note instead of converting its metadata to a thought', () => {
  const state = reducerFlow([
    importText({
      text: `
        - Group
          - Reify
            - =note
              - =path
                - names
            - Names
              - Bind Thought`,
    }),
    setCursor(['Group', 'Reify']),
  ])(initialState())

  const stateNew = swapNote(state)

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Group
    - Reify
      - =note
        - =path
          - names
      - Names
        - Bind Thought`)
  expect(stateNew.alert?.value).toBe('Path-based notes cannot be swapped.')
  expectPathToEqual(stateNew, stateNew.cursor, ['Group', 'Reify'])
})

it('preserves a parent path note instead of replacing its metadata with the selected thought', () => {
  const state = reducerFlow([
    importText({
      text: `
        - Reify
          - =note
            - =path
              - names
          - Names
            - Bind Thought
          - Other`,
    }),
    setCursor(['Reify', 'Other']),
  ])(initialState())

  const stateNew = swapNote(state)

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reify
    - =note
      - =path
        - names
    - Names
      - Bind Thought
    - Other`)
  expect(stateNew.alert?.value).toBe('Path-based notes cannot be swapped.')
  expectPathToEqual(stateNew, stateNew.cursor, ['Reify', 'Other'])
})

it('converts a literal note without modifying the parent path note', () => {
  const stateNew = reducerFlow([
    importText({
      text: `
        - Reify
          - =note
            - =path
              - names
          - Names
            - =note
              - Literal
            - Bind Thought`,
    }),
    setCursor(['Reify', 'Names']),
    swapNote,
  ])(initialState())

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reify
    - =note
      - =path
        - names
    - Names
      - Literal
      - Bind Thought`)
  expectPathToEqual(stateNew, stateNew.cursor, ['Reify', 'Names', 'Literal'])
})

it('thought to note', () => {
  const text = `
    - a
      - b
  `
  const steps = [importText({ text }), setCursor(['a', 'b']), swapNote]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =note
      - b`)

  expectPathToEqual(stateNew, stateNew.cursor, ['a'])
})

it('note to thought', () => {
  const text = `
    - a
      - =note
        - b
  `
  const steps = [importText({ text }), setCursor(['a']), swapNote]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)

  expectPathToEqual(stateNew, stateNew.cursor, ['a', 'b'])
})

it('swap thought and note', () => {
  const text = `
    - a
      - =note
        - b
      - c
  `
  const steps = [importText({ text }), setCursor(['a', 'c']), swapNote]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =note
      - c
    - b`)

  expectPathToEqual(stateNew, stateNew.cursor, ['a', 'b'])
})

it('moves grandchildren to parent when thought with children is converted to note', () => {
  const text = `
    - a
      - b
        - c
  `
  const steps = [importText({ text }), setCursor(['a', 'b']), swapNote]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =note
      - b
    - c`)

  expectPathToEqual(stateNew, stateNew.cursor, ['a'])
})

it('moves multiple grandchildren to parent when thought with children is converted to note', () => {
  const text = `
    - a
      - b
        - c
        - d
        - e
  `
  const steps = [importText({ text }), setCursor(['a', 'b']), swapNote]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =note
      - b
    - c
    - d
    - e`)

  expectPathToEqual(stateNew, stateNew.cursor, ['a'])
})

it('keeps duplicate siblings when note is converted to an identical thought (no merge)', () => {
  const text = `
    - a
      - =note
        - b
      - b
      - c
  `
  const steps = [importText({ text }), setCursor(['a']), swapNote]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
    - b
    - c`)

  expectPathToEqual(stateNew, stateNew.cursor, ['a', 'b'])
})
