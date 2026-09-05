import { fireEvent } from '@testing-library/react'
import { act } from 'react'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Opens the Help modal and the command sort dropdown. */
const openSortDropdown = async () => {
  await dispatch(showModal({ id: 'help' }))
  await act(vi.runOnlyPendingTimersAsync)

  await click('[aria-label="sort commands"]')
  await act(vi.runOnlyPendingTimersAsync)

  expect(document.querySelector('[aria-label="command sort options"]')).not.toBeNull()
}

it('closes the sort dropdown when the user clicks the search field', async () => {
  await openSortDropdown()

  const searchInput = document.querySelector('#search input')!
  await act(async () => {
    fireEvent.mouseDown(searchInput)
  })
  await act(vi.runOnlyPendingTimersAsync)

  expect(document.querySelector('[aria-label="command sort options"]')).toBeNull()
})

it('closes the sort dropdown when the user taps the search field', async () => {
  await openSortDropdown()

  const searchInput = document.querySelector('#search input')!
  await act(async () => {
    fireEvent.touchStart(searchInput)
  })
  await act(vi.runOnlyPendingTimersAsync)

  expect(document.querySelector('[aria-label="command sort options"]')).toBeNull()
})

it('keeps the sort dropdown open when the user clicks inside it', async () => {
  await openSortDropdown()

  const dropdown = document.querySelector('[aria-label="command sort options"]')!
  await act(async () => {
    fireEvent.mouseDown(dropdown)
  })
  await act(vi.runOnlyPendingTimersAsync)

  expect(document.querySelector('[aria-label="command sort options"]')).not.toBeNull()
})
