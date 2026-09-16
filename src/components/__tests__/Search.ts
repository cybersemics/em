import { fireEvent, screen } from '@testing-library/dom'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { searchActionCreator as search } from '../../actions/search'
import { executeCommandWithMulticursor } from '../../commands'
import searchCommand from '../../commands/search'
import { HOME_TOKEN } from '../../constants'
import { exportContext } from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// https://github.com/cybersemics/em/issues/4175
it.skip('Create a thought from the search input', async () => {
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

  await act(async () => {
    executeCommandWithMulticursor(searchCommand, { store })
  })

  await dispatch(search({ value: 'AAA' }))

  await act(vi.runOnlyPendingTimersAsync)

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create "AAA"' }))
  })

  await act(vi.runOnlyPendingTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - A
  - B
  - C
  - AAA`)
})
