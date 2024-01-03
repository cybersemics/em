import { HOME_TOKEN } from '../../constants'
import importText from '../../reducers/importText'
import thoughtToNote from '../../reducers/thoughtToNote'
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
  const steps = [importText({ text }), setCursor(['a', 'b']), thoughtToNote]

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
  const steps = [importText({ text }), setCursor(['a']), thoughtToNote]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)

  expect(pathToContext(stateNew, stateNew.cursor!)).toEqual(['a', 'b'])
})
