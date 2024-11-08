import importText from '../../actions/importText'
import swapNote from '../../actions/swapNote'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import pathToContext from '../../util/pathToContext'
import reducerFlow from '../../util/reducerFlow'

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

  expect(pathToContext(stateNew, stateNew.cursor!)).toEqual(['a'])
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

  expect(pathToContext(stateNew, stateNew.cursor!)).toEqual(['a', 'b'])
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

  expect(pathToContext(stateNew, stateNew.cursor!)).toEqual(['a', 'b'])
})
