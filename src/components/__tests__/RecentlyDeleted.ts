import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleSidebarActionCreator as toggleSidebar } from '../../actions/toggleSidebar'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// https://github.com/cybersemics/em/pull/6056#issuecomment-5631331940
it('does not list the children of an =archive that has been formatted into a normal thought as deleted', async () => {
  await dispatch([
    importText({
      text: `
- aaa
  - =archive
    - deleted1
- bbb
  - =archive
    - deleted2
`,
    }),
    editThought(['aaa', '=archive'], '<b>=archive</b>'),
    toggleSidebar({ value: true }),
  ])
  await act(vi.runOnlyPendingTimersAsync)

  act(() => (document.querySelector('[data-testid="sidebar-section-picker"]') as HTMLElement).click())
  await act(vi.runOnlyPendingTimersAsync)
  act(() => (document.querySelector('[data-testid="sidebar-recentlyDeleted"]') as HTMLElement).click())
  // RecentlyDeleted pulls the deleted thoughts before it renders them
  await act(vi.runAllTimersAsync)

  const sidebarText = document.querySelector('[data-testid="sidebar"]')!.textContent
  expect(sidebarText).toContain('deleted2')
  expect(sidebarText).not.toContain('deleted1')
})
