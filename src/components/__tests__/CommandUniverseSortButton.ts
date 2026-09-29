import { fireEvent, screen } from '@testing-library/react'
import { act } from 'react'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../actions/toggleMobileCommandUniverse'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// https://github.com/cybersemics/em/issues/4332
it('closes the Command Universe sort dropdown when the user taps the search field', async () => {
  await dispatch(toggleMobileCommandUniverse({ value: true }))
  await act(vi.runOnlyPendingTimersAsync)

  await click('[aria-label="Group commands"]')
  await act(vi.runOnlyPendingTimersAsync)
  expect(screen.getByRole('radio', { name: 'Alphabetical' })).toBeVisible()

  const searchInput = screen.getByPlaceholderText('Search for a command')
  await act(async () => {
    fireEvent.touchStart(searchInput)
    fireEvent.touchEnd(searchInput)
  })
  await act(vi.runOnlyPendingTimersAsync)

  expect(screen.queryByRole('radio', { name: 'Alphabetical' })).toBeNull()
  expect(searchInput).toBeVisible()
})
