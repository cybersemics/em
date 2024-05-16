import State from '../../@types/State'
import ThoughtId from '../../@types/ThoughtId'
import { importText } from '../../actions'
import { ROOT_PARENT_ID } from '../../constants'
import prettyPath from '../../test-helpers/prettyPath'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import keyValueBy from '../../util/keyValueBy'
import reducerFlow from '../../util/reducerFlow'
import calculateAutofocus from '../calculateAutofocus'
import contextToPath from '../contextToPath'
import thoughtToPath from '../thoughtToPath'

/** Get a map of all paths in the thoughtspace. */
const allPaths = (state: State) =>
  keyValueBy(state.thoughts.thoughtIndex, (id, thought) => {
    const simplePath = thoughtToPath(state, id as ThoughtId)
    return thought.parentId !== ROOT_PARENT_ID ? { [prettyPath(state, simplePath)]: simplePath } : null
  })

describe('normal view', () => {
  it('show thought', () => {
    const steps = [importText({ text: 'a' })]
    const stateNew = reducerFlow(steps)(initialState())
    const path = contextToPath(stateNew, ['a'])!
    expect(calculateAutofocus(stateNew, path)).toEqual('show')
  })

  it('show root thoughts', () => {
    const text = `
    - a
    - b
    - c
  `
    const steps = [importText({ text }), setCursor(['a'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'show',
      b: 'show',
      c: 'show',
    })
  })

  it('show parent of leaf', () => {
    const text = `
    - a
      - b
  `
    const steps = [importText({ text }), setCursor(['a', 'b'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'show',
      'a/b': 'show',
    })
  })

  it('dim parent of non-leaf', () => {
    const text = `
    - a
      - b
        - c
  `
    const steps = [importText({ text }), setCursor(['a', 'b'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'dim',
      'a/b': 'show',
      'a/b/c': 'show',
    })
  })

  it('dim sibling of non-leaf', () => {
    const text = `
    - a
      - b
        - c
      - d
  `
    const steps = [importText({ text }), setCursor(['a', 'b'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'dim',
      'a/b': 'show',
      'a/b/c': 'show',
      'a/d': 'dim',
    })
  })

  it('dim grandparent of leaf', () => {
    const text = `
    - a
      - b
        - c
  `
    const steps = [importText({ text }), setCursor(['a', 'b', 'c'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'dim',
      'a/b': 'show',
      'a/b/c': 'show',
    })
  })

  it('hide grandparent of non-leaf', () => {
    const text = `
    - a
      - b
        - c
          - d
  `
    const steps = [importText({ text }), setCursor(['a', 'b', 'c'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'hide-parent',
      'a/b': 'dim',
      'a/b/c': 'show',
      'a/b/c/d': 'show',
    })
  })

  it('hide great-grandparent', () => {
    const text = `
    - a
      - b
        - c
          - d
  `
    const steps = [importText({ text }), setCursor(['a', 'b', 'c', 'd'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'hide',
      'a/b': 'dim',
      'a/b/c': 'show',
      'a/b/c/d': 'show',
    })
  })

  it('hide great-great-grandparent', () => {
    const text = `
    - a
      - b
        - c
          - d
            -e
  `
    const steps = [importText({ text }), setCursor(['a', 'b', 'c', 'd', 'e'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'hide',
      'a/b': 'hide',
      'a/b/c': 'dim',
      'a/b/c/d': 'show',
      'a/b/c/d/e': 'show',
    })
  })

  it('show descendants', () => {
    const text = `
    - a
      - b
        - c
          - d
            - e
  `
    const steps = [importText({ text })]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'show',
      'a/b': 'show',
      'a/b/c': 'show',
      'a/b/c/d': 'show',
      'a/b/c/d/e': 'show',
    })
  })

  it('show leaf siblings', () => {
    const text = `
    - a
    - b
    - c
  `
    const steps = [importText({ text }), setCursor(['a'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'show',
      b: 'show',
      c: 'show',
    })
  })

  it('dim uncle of leaf', () => {
    const text = `
    - a
      - b
    - x
  `
    const steps = [importText({ text }), setCursor(['a', 'b'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'show',
      'a/b': 'show',
      x: 'dim',
    })
  })

  it('hide uncle of non-leaf', () => {
    const text = `
    - a
      - b
        - c
    - x
  `
    const steps = [importText({ text }), setCursor(['a', 'b'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'dim',
      'a/b': 'show',
      'a/b/c': 'show',
      x: 'hide-parent',
    })
  })

  it('hide great great uncle of leaf', () => {
    const text = `
    - a
      - b
        - c
          - d
    - x
  `
    const steps = [importText({ text }), setCursor(['a', 'b', 'c', 'd'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toEqual({
      a: 'hide',
      'a/b': 'dim',
      'a/b/c': 'show',
      'a/b/c/d': 'show',
      x: 'hide',
    })
  })

  it('hide great uncle of non-leaf', () => {
    const text = `
    - a
      - b
        - c
          - d
            - e
      - f
  `
    const steps = [importText({ text }), setCursor(['a', 'b', 'c'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))

    expect(autofocusMap).toEqual({
      a: 'hide-parent',
      'a/b': 'dim',
      'a/b/c': 'show',
      'a/b/c/d': 'show',
      'a/b/c/d/e': 'show',
      'a/f': 'hide-parent',
    })
  })

  it('dim descendants of pinned uncle', () => {
    const text = `
      - a
        - b
          - =pin
            - true
          - c
        - d
    `
    const steps = [importText({ text }), setCursor(['a', 'd'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toMatchObject({
      a: 'show',
      'a/b': 'show',
      'a/b/c': 'dim',
      'a/d': 'show',
    })
  })

  it('dim descendants of pinned second cousin', () => {
    const text = `
      - a
        - b
          - =pin
            - true
          - c
        - d
          - e
    `
    const steps = [importText({ text }), setCursor(['a', 'd', 'e'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toMatchObject({
      a: 'dim',
      'a/b': 'dim',
      'a/b/c': 'dim',
      'a/d': 'show',
      'a/d/e': 'show',
    })
  })

  it('dim descendants of pinned root child', () => {
    const text = `
      - a
        - =pin
          - true
        - b
      - c
        - d
    `
    const steps = [importText({ text }), setCursor(['c'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toMatchObject({
      a: 'dim',
      'a/b': 'dim',
      c: 'show',
      'c/d': 'show',
    })
  })

  it('hide descendants of pinned great cousins (1)', () => {
    const text = `
      - a
        - b
          - =pin
            - true
          - c
        - d
          - e
            - f
     `
    const steps = [importText({ text }), setCursor(['a', 'd', 'e'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toMatchObject({
      a: 'hide-parent',
      'a/b': 'hide-parent',
      'a/b/c': 'hide',
      'a/d': 'dim',
      'a/d/e': 'show',
      'a/d/e/f': 'show',
    })
  })

  it('hide descendants of pinned great cousins (2)', () => {
    const text = `
      - a
        - =children
          - =pin
            - true
        - b
          - c
            - d
        - e
          - f
            - g
              - h
                - i
    `
    const steps = [importText({ text }), setCursor(['a', 'b', 'c', 'd'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))
    expect(autofocusMap).toMatchObject({
      a: 'hide',
      'a/b': 'dim',
      'a/b/c': 'show',
      'a/b/c/d': 'show',
      'a/e': 'hide',
      'a/e/f': 'hide',
      'a/e/f/g': 'hide',
      'a/e/f/g/h': 'hide',
      'a/e/f/g/h/i': 'hide',
    })
  })
})

describe('table view', () => {
  it('when the cursor is on a table grandchild leaf (column 2), other grandchildren of the table should be visible and dimmed', () => {
    const text = `
      - a
        - =view
          - Table
        - b
          - c
        - k
          - m
        - e
          - f
    `

    const steps = [importText({ text }), setCursor(['a', 'e', 'f'])]
    const stateNew = reducerFlow(steps)(initialState())
    const autofocusMap = keyValueBy(allPaths(stateNew), (key, simplePath) => ({
      [key]: calculateAutofocus(stateNew, simplePath),
    }))

    expect(autofocusMap).toMatchObject({
      'a/b/c': 'dim',
      'a/k/m': 'dim',
    })
  })
})
