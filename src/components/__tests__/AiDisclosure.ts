import { fireEvent, screen } from '@testing-library/dom'
import { act } from 'react'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import requestAiDisclosure, {
  clearAiDisclosureAcknowledgement,
  hasAcknowledgedAiDisclosure,
} from '../../util/aiDisclosure'

beforeEach(createTestApp)
beforeEach(() => {
  clearAiDisclosureAcknowledgement()
})

afterEach(() => {
  clearAiDisclosureAcknowledgement()
})
afterEach(cleanupTestApp)

it('allows the user to cancel without acknowledging', async () => {
  requestAiDisclosure(() => undefined)
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
  requestAiDisclosure(() => undefined)
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
  requestAiDisclosure(() => undefined)
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

it('returns to Settings when the Settings disclosure is closed with Escape', async () => {
  await dispatch(showModal({ id: 'settings' }))
  await act(vi.runOnlyPendingTimersAsync)

  await act(async () => {
    fireEvent.click(screen.getByText('AI Data Acknowledgment'))
  })
  await act(vi.runOnlyPendingTimersAsync)

  await act(async () => {
    fireEvent.keyDown(window, { key: 'Escape' })
  })
  await act(vi.runOnlyPendingTimersAsync)

  expect(screen.getByRole('heading', { name: 'Settings' })).toBeVisible()
  expect(hasAcknowledgedAiDisclosure()).toBe(false)
})

it('lets the user toggle the AI data acknowledgement in Settings', async () => {
  await dispatch(showModal({ id: 'settings' }))

  await act(vi.runOnlyPendingTimersAsync)

  expect(screen.getByText('AI Data Acknowledgment')).toBeVisible()
  expect(
    screen.getByText(
      'Allows AI features without asking each time on this device. Relevant thought content may be sent to an AI service when an AI feature is used.',
    ),
  ).toBeVisible()

  await act(async () => {
    fireEvent.click(screen.getByText('AI Data Acknowledgment'))
  })
  await act(vi.runOnlyPendingTimersAsync)

  expect(screen.queryByRole('button', { name: 'Allow once' })).toBeNull()
  expect(hasAcknowledgedAiDisclosure()).toBe(false)

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  })
  await act(vi.runOnlyPendingTimersAsync)

  expect(store.getState().showModal).toBe('settings')
  expect(hasAcknowledgedAiDisclosure()).toBe(false)

  await act(async () => {
    fireEvent.click(screen.getByText('AI Data Acknowledgment'))
  })
  await act(vi.runOnlyPendingTimersAsync)

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Always allow' }))
  })
  await act(vi.runAllTimersAsync)

  expect(store.getState().showModal).toBe('settings')
  expect(hasAcknowledgedAiDisclosure()).toBe(true)

  expect(
    screen.getByText(
      'Allows AI features without asking each time on this device. Relevant thought content may be sent to an AI service when an AI feature is used.',
    ),
  ).toBeVisible()

  await act(async () => {
    fireEvent.click(screen.getByText('AI Data Acknowledgment'))
  })

  expect(hasAcknowledgedAiDisclosure()).toBe(false)
})
