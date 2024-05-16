import importText from '../../actions/importText'
import toggleContextView from '../../actions/toggleContextView'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

it('set the cursor to a SimplePath', () => {
  const text = `
    - a
      - b
        - c`

  const steps = [importText({ text }), setCursor(['a', 'b', 'c']), toggleContextView]

  const expectedCursor = [
    { value: 'a', rank: 0 },
    { value: 'b', rank: 0 },
    { value: 'c', rank: 0 },
  ]

  const stateNew = reducerFlow(steps)(initialState())

  const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)
  expect(cursorThoughts).toMatchObject(expectedCursor)
})

it('set the cursor to a Path across a context view', () => {
  const text = `
    - a
      - m
        - x
    - b
      - m
        - y
  `

  const steps = [importText({ text }), setCursor(['a', 'm']), toggleContextView, setCursor(['a', 'm', 'b', 'y'])]

  const stateNew = reducerFlow(steps)(initialState())

  const expectedCursor = [
    { value: 'a', rank: 0 },
    { value: 'm', rank: 0 },
    { value: 'b', rank: 1 },
    { value: 'y', rank: 0 },
  ]

  const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

  expect(cursorThoughts).toMatchObject(expectedCursor)
})
