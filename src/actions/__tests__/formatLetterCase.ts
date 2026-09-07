import { act } from 'react'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursorFirstMatch } from '../../test-helpers/setCursorFirstMatch'
import { formatLetterCaseActionCreator as formatLetterCase } from '../formatLetterCase'
import { importTextActionCreator as importText } from '../importText'
import { setCursorActionCreator as setCursor } from '../setCursor'

beforeEach(initStore)

it('applies letter case to the thought when the caret is on the thought', async () => {
  await dispatch([
    importText({
      text: `
        - Hello World
          - =note
            - Hello Note
      `,
    }),
    setCursorFirstMatch(['Hello World']),
  ])

  await dispatch(formatLetterCase('UpperCase'))

  await act(vi.runOnlyPendingTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - HELLO WORLD
    - =note
      - Hello Note`)
})

it('applies letter case to the note when the caret is on the note', async () => {
  await dispatch([
    importText({
      text: `
        - Hello World
          - =note
            - Hello Note
      `,
    }),
    setCursorFirstMatch(['Hello World']),
  ])

  await dispatch(setCursor({ path: store.getState().cursor, noteFocus: true }))

  await dispatch(formatLetterCase('UpperCase'))

  await act(vi.runOnlyPendingTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - Hello World
    - =note
      - HELLO NOTE`)
})

it('preserves note focus after applying letter case to the note', async () => {
  await dispatch([
    importText({
      text: `
        - Hello World
          - =note
            - Hello Note
      `,
    }),
    setCursorFirstMatch(['Hello World']),
  ])

  await dispatch(setCursor({ path: store.getState().cursor, noteFocus: true }))

  await dispatch(formatLetterCase('UpperCase'))

  await act(vi.runOnlyPendingTimersAsync)

  expect(store.getState().noteFocus).toBe(true)
})
