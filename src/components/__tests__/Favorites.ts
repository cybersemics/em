import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { outdentActionCreator as outdent } from '../../actions/outdent'
import { toggleSidebarActionCreator as toggleSidebar } from '../../actions/toggleSidebar'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Returns the text of every favorite listed in the sidebar. */
const favorites = () =>
  Array.from(document.querySelectorAll('[data-testid="favorites"] [data-testid="drag-and-drop-favorite"]')).map(
    favorite => favorite.textContent,
  )

// https://github.com/cybersemics/em/pull/6056#issuecomment-5631331940
it('does not list a thought whose =favorite has been formatted into a normal thought', async () => {
  await dispatch([
    importText({
      text: `
- aaa
  - =favorite
- bbb
  - =favorite
`,
    }),
    editThought(['aaa', '=favorite'], '<b>=favorite</b>'),
    toggleSidebar({ value: true }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(favorites()).toEqual(['bbb'])
})

// https://github.com/cybersemics/em/issues/6169
it('does not list the root when =favorite is outdented to the root', async () => {
  await dispatch([
    importText({
      text: `
- a
  - =favorite
- b
  - =favorite
`,
    }),
    setCursor(['a', '=favorite']),
    outdent(),
    toggleSidebar({ value: true }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(favorites()).toEqual(['b'])
})
