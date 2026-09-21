import { fireEvent } from '@testing-library/react'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { searchActionCreator as search } from '../../actions/search'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// https://github.com/cybersemics/em/issues/5587
it('does not create a new thought when Enter is pressed in the search input', async () => {
  await dispatch([
    importText({
      text: `
        - A
        - B
        - C
      `,
    }),
    setCursor(['C']),
  ])
  await act(vi.runOnlyPendingTimersAsync)

  await dispatch(search({ value: '' }))
  await act(vi.runOnlyPendingTimersAsync)

  const searchInput = document.querySelector('[placeholder="Search"]')!
  fireEvent.keyDown(searchInput, { key: 'Enter' })
  await act(vi.runOnlyPendingTimersAsync)

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - A
  - B
  - C`)
})
