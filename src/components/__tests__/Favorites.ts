import { fireEvent } from '@testing-library/react'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleSidebarActionCreator as toggleSidebar } from '../../actions/toggleSidebar'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Returns the text of each favorite in the sidebar, excluding its context breadcrumbs. */
const favoritesText = () =>
  Array.from(document.querySelectorAll('[data-testid="drag-and-drop-favorite"] [data-thought-link]'))
    .filter(link => !link.closest('[aria-label="context-breadcrumbs"]'))
    .map(link => link.textContent)

// https://github.com/cybersemics/em/issues/5833
it.skip('uncategorizing a favorited top-level thought favorites a new empty parent shown with a placeholder', async () => {
  await dispatch([
    importText({
      text: `
- a
  - =favorite
- b
`,
    }),
    setCursor(['a']),
    toggleSidebar({ value: true }),
  ])
  await act(vi.runOnlyPendingTimersAsync)

  // Uncategorize
  await act(async () => {
    fireEvent.keyDown(document, { key: 'c', code: 'KeyC', metaKey: true, altKey: true })
    await vi.runOnlyPendingTimersAsync()
  })

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - 
    - =favorite
    - a
  - b`)
  expect(favoritesText()).toEqual(['This is an empty thought'])
})
