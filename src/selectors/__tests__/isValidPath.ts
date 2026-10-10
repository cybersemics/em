import Path from '../../@types/Path'
import importText from '../../actions/importText'
import toggleContextView from '../../actions/toggleContextView'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import moveThoughtAtFirstMatch from '../../test-helpers/moveThoughtAtFirstMatch'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import isValidPath from '../isValidPath'

it('a path that follows the parent chain is valid', () => {
  const state = importText(initialState(), {
    text: `
      - a
        - b
          - c
    `,
  })

  expect(isValidPath(state, contextToPathOrThrow(state, ['a', 'b', 'c'], 'isValidPath'))).toBe(true)
})

it('a path to a thought that has since been moved is invalid', () => {
  const stateBefore = importText(initialState(), {
    text: `
      - a
        - b
      - c
    `,
  })
  const pathBefore = contextToPathOrThrow(stateBefore, ['a', 'b'], 'isValidPath')

  const state = moveThoughtAtFirstMatch(stateBefore, { from: ['a', 'b'], to: ['c', 'b'], newRank: 0 })

  expect(isValidPath(state, pathBefore)).toBe(false)
})

it('a path whose first thought has since been moved out of the root is invalid', () => {
  const stateBefore = importText(initialState(), {
    text: `
      - a
      - b
    `,
  })
  const pathBefore = contextToPathOrThrow(stateBefore, ['a'], 'isValidPath')

  const state = moveThoughtAtFirstMatch(stateBefore, { from: ['a'], to: ['b', 'a'], newRank: 0 })

  expect(isValidPath(state, pathBefore)).toBe(false)
})

it('a path that crosses into a context view is valid', () => {
  const state = reducerFlow([
    importText({
      text: `
        - a
          - m
            - x
        - b
          - m
            - y
      `,
    }),
    setCursor(['a', 'm']),
    toggleContextView,
  ])(initialState())

  expect(isValidPath(state, contextToPathOrThrow(state, ['a', 'm', 'b', 'y'], 'isValidPath'))).toBe(true)
})

it('a path through thoughts that are not loaded yet is valid', () => {
  const state = importText(initialState(), {
    text: `
      - a
    `,
  })
  const path = [...contextToPathOrThrow(state, ['a'], 'isValidPath'), 'notloaded1', 'notloaded2'] as unknown as Path

  expect(isValidPath(state, path)).toBe(true)
})
