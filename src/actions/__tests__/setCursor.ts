import importText from '../../actions/importText'
import toggleContextView from '../../actions/toggleContextView'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import expectThoughtValuesInOrder from '../../test-helpers/expectThoughtValuesInOrder'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

it('set the cursor to a SimplePath', () => {
  const text = `
    - a
      - b
        - c`

  const steps = [importText({ text }), setCursor(['a', 'b', 'c']), toggleContextView]

  const stateNew = reducerFlow(steps)(initialState())

  const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)
  expectThoughtValuesInOrder(cursorThoughts, ['a', 'b', 'c'])
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

  const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

  expectThoughtValuesInOrder(cursorThoughts, ['a', 'm', 'b', 'y'])
})
