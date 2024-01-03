import { HOME_TOKEN } from '../../constants'
import importText from '../../reducers/importText'
import thoughtToNote from '../../reducers/thoughtToNote'
import exportContext from '../../selectors/exportContext'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

it('convert the cursor to a note', () => {
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
})
