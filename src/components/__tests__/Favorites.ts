import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { outdentActionCreator as outdent } from '../../actions/outdent'
import { toggleSidebarActionCreator as toggleSidebar } from '../../actions/toggleSidebar'
import { undoActionCreator as undo } from '../../actions/undo'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Returns the text of every favorite listed in the sidebar. */
const favorites = () =>
  Array.from(document.querySelectorAll('[data-testid="favorites"] [data-testid="drag-and-drop-favorite"]')).map(
    favorite => favorite.textContent,
  )

// https://github.com/cybersemics/em/pull/6056#issuecomment-5631331940
it('hides a formatted favorite and restores its original position on undo', async () => {
  await dispatch([
    importText({
      text: `
- aaa
  - =favorite
- bbb
  - =favorite
`,
    }),
    toggleSidebar({ value: true }),
  ])

  await act(vi.runOnlyPendingTimersAsync)
  await act(waitForThoughtspaceIdle)
  const [first, second] = favorites()

  await dispatch(editThought([first, '=favorite'], '<b>=favorite</b>'))
  expect(favorites()).toEqual([second])

  await dispatch(undo())
  await act(waitForThoughtspaceIdle)
  expect(favorites()).toEqual([first, second])
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
