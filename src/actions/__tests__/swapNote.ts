import importText from '../../actions/importText'
import swapNote from '../../actions/swapNote'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
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

  expectPathToEqual(stateNew, stateNew.cursor, ['a'])
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

  expectPathToEqual(stateNew, stateNew.cursor, ['a', 'b'])
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

  expectPathToEqual(stateNew, stateNew.cursor, ['a', 'b'])
})

it('moves grandchildren to parent when thought with children is converted to note', () => {
  const text = `
    - a
      - b
        - c
  `
  const steps = [importText({ text }), setCursor(['a', 'b']), swapNote]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =note
      - b
    - c`)

  expectPathToEqual(stateNew, stateNew.cursor, ['a'])
})

it('moves multiple grandchildren to parent when thought with children is converted to note', () => {
  const text = `
    - a
      - b
        - c
        - d
        - e
  `
  const steps = [importText({ text }), setCursor(['a', 'b']), swapNote]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =note
      - b
    - c
    - d
    - e`)

  expectPathToEqual(stateNew, stateNew.cursor, ['a'])
})
