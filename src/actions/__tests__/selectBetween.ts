import selectBetween from '../../actions/selectBetween'
import getThoughtById from '../../selectors/getThoughtById'
import addMulticursor from '../../test-helpers/addMulticursorAtFirstMatch'
import prettyPath from '../../test-helpers/prettyPath'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import toggleContextView from '../toggleContextView'

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

  const stateNew = reducerFlow(steps)(initialState())

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

  const stateNew = reducerFlow(steps)(initialState())

  const selected = Object.values(stateNew.multicursors)
    .map(path => prettyPath(stateNew, path))
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

  const stateNew = reducerFlow(steps)(initialState())

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

  const stateNew = reducerFlow(steps)(initialState())

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

  const stateNew = reducerFlow(steps)(initialState())

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

  const stateNew = reducerFlow(steps)(initialState())

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

  const stateNew = reducerFlow(steps)(initialState())

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

  const steps = [importText({ text }), setCursor(['x', 'b']), selectBetween]

  const stateNew = reducerFlow(steps)(initialState())

  const selected = Object.values(stateNew.multicursors)
    .map(path => getThoughtById(stateNew, head(path))?.value)
    .sort()

  expect(selected).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
})

test('alert if there are no thoughts', () => {
  const state = initialState()
  const stateNew = selectBetween(state)
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

  const stateNew = reducerFlow(steps)(initialState())
  expect(stateNew).toHaveProperty('alert')
})
