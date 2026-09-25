import importText from '../../actions/importText'
import moveThought from '../../actions/moveThought'
import initStore from '../../test-helpers/initStore'
import reducerFlow from '../../test-helpers/reducerFlow'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import pathToContext from '../../util/pathToContext'
import contextToPath from '../contextToPath'
import documentSort from '../documentSort'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('siblings by rank', () => {
  const text = `
    - a
    - b
    - c
  `

  const state = runDocumentCommand((state, document) => importText(state, { text }, document), initialState())

  const a = contextToPath(state, ['a'])!
  const b = contextToPath(state, ['b'])!
  const c = contextToPath(state, ['c'])!

  // move b to the top of the context
  const stateNew = runDocumentCommand(
    (state, document) => moveThought(state, { oldPath: b, newPath: b, afterId: null }, document),
    state,
  )

  const pathsSorted = documentSort(stateNew, [a, b, c])
  const contextsSorted = pathsSorted.map(path => pathToContext(stateNew, path))

  expect(contextsSorted).toEqual([['b'], ['a'], ['c']])
})

it('ignore order of input paths', () => {
  const text = `
    - a
    - b
    - c
  `

  const state = runDocumentCommand((state, document) => importText(state, { text }, document), initialState())

  const a = contextToPath(state, ['a'])!
  const b = contextToPath(state, ['b'])!
  const c = contextToPath(state, ['c'])!

  // move b to the top of the context
  const stateNew = runDocumentCommand(
    (state, document) => moveThought(state, { oldPath: b, newPath: b, afterId: null }, document),
    state,
  )

  const pathsSorted = documentSort(stateNew, [c, b, a])
  const contextsSorted = pathsSorted.map(path => pathToContext(stateNew, path))

  expect(contextsSorted).toEqual([['b'], ['a'], ['c']])
})

it('parents and children', () => {
  const text = `
    - a
      - a1
      - a2
    - b
      - b1
      - b2
    - c
  `

  const state = runDocumentCommand((state, document) => importText(state, { text }, document), initialState())

  const a = contextToPath(state, ['a'])!
  const a1 = contextToPath(state, ['a', 'a1'])!
  const a2 = contextToPath(state, ['a', 'a2'])!
  const b = contextToPath(state, ['b'])!
  const b1 = contextToPath(state, ['b', 'b1'])!
  const b2 = contextToPath(state, ['b', 'b2'])!
  const c = contextToPath(state, ['c'])!

  const steps = [
    // move b to the top
    moveThought({ oldPath: b, newPath: b, afterId: null }),
    // move b2 to the top of b
    moveThought({ oldPath: b2, newPath: b2, afterId: null }),
  ]
  const stateNew = reducerFlow(steps)(state)

  const pathsSorted = documentSort(stateNew, [a2, b1, a1, c, b, b2, a])
  const contextsSorted = pathsSorted.map(path => pathToContext(stateNew, path))

  expect(contextsSorted).toEqual([['b'], ['b', 'b2'], ['b', 'b1'], ['a'], ['a', 'a1'], ['a', 'a2'], ['c']])
})
