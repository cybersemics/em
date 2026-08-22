import { fireEvent, screen } from '@testing-library/dom'
import { act } from 'react'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { clearAiDisclosureAcknowledgement, hasAcknowledgedAiDisclosure } from '../../util/aiDisclosure'

beforeEach(createTestApp)
beforeEach(() => {
  clearAiDisclosureAcknowledgement()
})

afterEach(() => {
  clearAiDisclosureAcknowledgement()
})
afterEach(cleanupTestApp)

it('allows the user to cancel without acknowledging', async () => {
  await dispatch(showModal({ id: 'aiDisclosure' }))

  await act(vi.runOnlyPendingTimersAsync)

  expect(screen.getByText('AI Data Acknowledgment')).toBeTruthy()
  expect(screen.getByText(/OpenAI service/i)).toBeTruthy()
  expect(hasAcknowledgedAiDisclosure()).toBe(false)

  await act(async () => {
    fireEvent.keyDown(window, { key: 'Escape' })
  })
  await act(vi.runOnlyPendingTimersAsync)

  expect(store.getState().showModal).toBeNull()
  expect(hasAcknowledgedAiDisclosure()).toBe(false)
})

it('allows one use without persisting acknowledgement', async () => {
  await dispatch(showModal({ id: 'aiDisclosure' }))

  await act(vi.runOnlyPendingTimersAsync)

  const allowOnceButton = screen.getByRole('button', { name: 'Allow once' })
  await act(async () => {
    fireEvent.click(allowOnceButton)
  })

  await act(vi.runAllTimersAsync)

  expect(hasAcknowledgedAiDisclosure()).toBe(false)
  expect(store.getState().showModal).toBeNull()
})

it('persists acknowledgement when the user chooses to remember it', async () => {
  await dispatch(showModal({ id: 'aiDisclosure' }))

  await act(vi.runOnlyPendingTimersAsync)

  const rememberButton = screen.getByRole('button', { name: 'Always allow' })
  await act(async () => {
    fireEvent.click(rememberButton)
  })

  await act(vi.runAllTimersAsync)

  expect(hasAcknowledgedAiDisclosure()).toBe(true)
  expect(store.getState().showModal).toBeNull()
})
