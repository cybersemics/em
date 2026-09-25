import selectBetween from '../../actions/selectBetween'
import toggleMulticursor from '../../actions/toggleMulticursor'
import contextToPath from '../../selectors/contextToPath'
import getThoughtById from '../../selectors/getThoughtById'
import addMulticursor from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import prettyPath from '../../test-helpers/prettyPath'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import head from '../../util/head'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import toggleContextView from '../toggleContextView'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

test('select between two thoughts in the root', () => {
  const text = `
    - a
    - b
    - c
    - d
    - e
    - f
  `

  const steps = [importText({ text }), setCursor(['b']), addMulticursor(['b']), addMulticursor(['e']), selectBetween]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

  const selected = Object.values(stateNew.multicursors)
    .map(path => prettyPath(stateNew, path))
    .sort()

  expect(selected).toEqual(['b', 'c', 'd', 'e'])
})

test('ignore order of selected thoughts', () => {
  const text = `
    - a
    - b
    - c
    - d
    - e
    - f
  `

  const steps = [importText({ text }), setCursor(['b']), addMulticursor(['e']), addMulticursor(['b']), selectBetween]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

  const selected = Object.values(stateNew.multicursors)
    .map(path => prettyPath(stateNew, path))
    .sort()

  expect(selected).toEqual(['b', 'c', 'd', 'e'])
})

test('select between two thoughts in a sorted list', () => {
  const text = `
    - x
      - =sort
        - Alphabetical
      - f
      - c
      - a
      - e
      - d
      - b
  `

  const steps = [
    importText({ text }),
    setCursor(['x', 'b']),
    addMulticursor(['x', 'b']),
    addMulticursor(['x', 'e']),
    selectBetween,
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

  const selected = Object.values(stateNew.multicursors)
    .map(path => getThoughtById(stateNew, head(path))?.value)
    .sort()

  expect(selected).toEqual(['b', 'c', 'd', 'e'])
})

test('select between two thoughts at the same level', () => {
  const text = `
    - x
      - a
      - b
      - c
      - d
      - e
      - f
  `

  const steps = [
    importText({ text }),
    setCursor(['x', 'b']),
    addMulticursor(['x', 'b']),
    addMulticursor(['x', 'e']),
    selectBetween,
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

  const selected = Object.values(stateNew.multicursors)
    .map(path => getThoughtById(stateNew, head(path))?.value)
    .sort()

  expect(selected).toEqual(['b', 'c', 'd', 'e'])
})

test('if no thoughts are selected, select all thoughts at the cursor level', () => {
  const text = `
    - x
      - a
      - b
      - c
      - d
      - e
      - f
  `

  const steps = [importText({ text }), setCursor(['x', 'b']), selectBetween]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

  const selected = Object.values(stateNew.multicursors)
    .map(path => getThoughtById(stateNew, head(path))?.value)
    .sort()

  expect(selected).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
})

test('if no thoughts are selected in a context view, select all contexts at the cursor level', () => {
  const text = `
    - a
      - m
        - x
        - y
        - z
    - b
      - m
        - t
        - u
        - v
  `

  const steps = [
    importText({ text }),
    setCursor(['a', 'm']),
    toggleContextView,
    setCursor(['a', 'm', 'a']),
    selectBetween,
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

  const selected = Object.values(stateNew.multicursors)
    .map(path => prettyPath(stateNew, path))
    .sort()

  expect(selected).toEqual(['a/m/a', 'a/m/b'])
})

test('select between two contexts in a context view', () => {
  const text = `
    - a
      - m
        - x
    - b
      - m
        - y
    - c
      - m
        - z
  `

  const steps = [
    importText({ text }),
    setCursor(['a', 'm']),
    toggleContextView,
    setCursor(['a', 'm', 'a']),
    addMulticursor(['a', 'm', 'a']),
    addMulticursor(['a', 'm', 'c']),
    selectBetween,
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

  const selected = Object.values(stateNew.multicursors)
    .map(path => prettyPath(stateNew, path))
    .sort()

  expect(selected).toEqual(['a/m/a', 'a/m/b', 'a/m/c'])
})

test('if no thoughts are selected after crossing a context view boundary, select all thoughts at the cursor level', () => {
  const text = `
    - a
      - m
        - x
        - y
        - z
    - b
      - m
        - t
        - u
        - v
  `

  const steps = [
    importText({ text }),
    setCursor(['a', 'm']),
    toggleContextView,
    setCursor(['a', 'm', 'b', 't']),
    selectBetween,
  ]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

  const selected = Object.values(stateNew.multicursors)
    .map(path => prettyPath(stateNew, path))
    .sort()

  expect(selected).toEqual(['a/m/b/t', 'a/m/b/u', 'a/m/b/v'])
})

test('if no thoughts are selected and there is no cursor, select all thoughts at root', () => {
  const text = `
    - a
    - b
    - c
    - d
    - e
    - f
  `

  const steps = [importText({ text }), setCursor(null), selectBetween]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

  const selected = Object.values(stateNew.multicursors)
    .map(path => getThoughtById(stateNew, head(path))?.value)
    .sort()

  expect(selected).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
})

test('alert if there are no thoughts', () => {
  const state = initialState()
  const stateNew = runDocumentCommand((state, document) => selectBetween(state, document), state)
  expect(stateNew).toHaveProperty('alert')
})

test('alert if there is only one thought', () => {
  const text = `
    - a
    - b
    - c
    - d
    - e
    - f
  `

  const steps = [importText({ text }), setCursor(['b']), addMulticursor(['b']), selectBetween]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())
  expect(stateNew).toHaveProperty('alert')
})

test('adjusts the active range while preserving the original anchor', () => {
  const text = `
    - a
    - b
    - c
    - d
    - e
    - f
  `

  let stateNew = runDocumentCommand((state, document) => importText(state, { text }, document), initialState())
  stateNew = toggleMulticursor(stateNew, { path: contextToPath(stateNew, ['a'])! })
  stateNew = runDocumentCommand(
    (state, document) => selectBetween(state, { path: contextToPath(stateNew, ['e'])! }, document),
    stateNew,
  )
  stateNew = runDocumentCommand(
    (state, document) => selectBetween(state, { path: contextToPath(stateNew, ['c'])! }, document),
    stateNew,
  )

  const selected = Object.values(stateNew.multicursors)
    .map(path => prettyPath(stateNew, path))
    .sort()

  expect(selected).toEqual(['a', 'b', 'c'])
})

test('preserves independently selected thoughts when extending from a new anchor', () => {
  const text = `
    - a
    - b
    - c
    - d
    - e
    - f
  `

  let stateNew = runDocumentCommand((state, document) => importText(state, { text }, document), initialState())
  stateNew = toggleMulticursor(stateNew, { path: contextToPath(stateNew, ['a'])! })
  stateNew = toggleMulticursor(stateNew, { path: contextToPath(stateNew, ['c'])! })
  stateNew = runDocumentCommand(
    (state, document) => selectBetween(state, { path: contextToPath(stateNew, ['e'])! }, document),
    stateNew,
  )

  const selected = Object.values(stateNew.multicursors)
    .map(path => prettyPath(stateNew, path))
    .sort()

  expect(selected).toEqual(['a', 'c', 'd', 'e'])
})

test('preserves a committed range when selecting from a new anchor', () => {
  const text = `
    - a
    - b
    - c
    - d
    - e
    - f
    - g
    - h
  `

  let stateNew = runDocumentCommand((state, document) => importText(state, { text }, document), initialState())
  stateNew = toggleMulticursor(stateNew, { path: contextToPath(stateNew, ['b'])! })
  stateNew = runDocumentCommand(
    (state, document) => selectBetween(state, { path: contextToPath(stateNew, ['d'])! }, document),
    stateNew,
  )
  stateNew = toggleMulticursor(stateNew, { path: contextToPath(stateNew, ['f'])! })
  stateNew = runDocumentCommand(
    (state, document) => selectBetween(state, { path: contextToPath(stateNew, ['h'])! }, document),
    stateNew,
  )

  const selected = Object.values(stateNew.multicursors)
    .map(path => prettyPath(stateNew, path))
    .sort()

  expect(selected).toEqual(['b', 'c', 'd', 'f', 'g', 'h'])
})

test('does not use a deselected thought as the next Select Between anchor', () => {
  const text = `
    - a
    - b
    - c
    - d
    - e
  `

  let stateNew = runDocumentCommand((state, document) => importText(state, { text }, document), initialState())
  stateNew = toggleMulticursor(stateNew, { path: contextToPath(stateNew, ['b'])! })
  stateNew = runDocumentCommand(
    (state, document) => selectBetween(state, { path: contextToPath(stateNew, ['d'])! }, document),
    stateNew,
  )
  stateNew = toggleMulticursor(stateNew, { path: contextToPath(stateNew, ['d'])! })
  stateNew = runDocumentCommand(
    (state, document) => selectBetween(state, { path: contextToPath(stateNew, ['a'])! }, document),
    stateNew,
  )

  const selected = Object.values(stateNew.multicursors)
    .map(path => prettyPath(stateNew, path))
    .sort()

  expect(selected).toEqual(['a', 'b', 'c'])
})
