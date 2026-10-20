import { fireEvent, screen } from '@testing-library/dom'
import { act } from 'react'
import FeedbackPayload from '../../../packages/feedback/shared/FeedbackPayload'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import importToContext from '../../test-helpers/importToContext'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import debugLog from '../../util/debugLog'

const upload = vi.hoisted(() => vi.fn())
vi.mock('@vercel/blob/client', () => ({ upload }))
const fetchMock = vi.fn<typeof fetch>()
const originalFetch = globalThis.fetch

beforeEach(async () => {
  await createTestApp()
  upload.mockReset().mockResolvedValue({})
  fetchMock.mockReset().mockImplementation(async (_url, init) => {
    const body = JSON.parse(init!.body as string) as { id: string; payload?: FeedbackPayload }
    return {
      ok: true,
      json: async () =>
        body.payload
          ? {
              submitted: false,
              files: body.payload.files.map((_: unknown, index: number) => ({
                pathname: `feedback/${body.id}/${index}`,
                uploaded: false,
              })),
            }
          : { submitted: true },
    } as Response
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(async () => {
  await cleanupTestApp()
  vi.stubGlobal('fetch', originalFetch)
})

it('sends a message without optional private data by default', async () => {
  await dispatch(showModal({ id: 'feedback' }))
  await act(async () => {
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'A useful suggestion' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await vi.dynamicImportSettled()
    await vi.runAllTimersAsync()
  })
  const request = JSON.parse(fetchMock.mock.calls[0][1]!.body as string) as { payload: FeedbackPayload }
  expect(request.payload).toEqual({
    name: '',
    email: '',
    message: 'A useful suggestion',
    files: [],
    metadata: {
      version: expect.any(String),
      commit: expect.any(String),
      userAgent: navigator.userAgent,
      platform: 'web',
    },
  })
  expect(screen.queryByRole('dialog', { name: 'Send Feedback' })).not.toBeInTheDocument()
})

it('remembers identity but discards the cancelled message', async () => {
  await dispatch(showModal({ id: 'feedback' }))
  await act(async () => {
    fireEvent.change(screen.getByRole('textbox', { name: 'Name (optional)' }), { target: { value: 'Trevin' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email (optional)' }), {
      target: { value: 'person@example.com' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Unsent draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  })
  await dispatch(showModal({ id: 'feedback' }))
  expect(screen.getByRole('textbox', { name: 'Name (optional)' })).toHaveValue('Trevin')
  expect(screen.getByRole('textbox', { name: 'Email (optional)' })).toHaveValue('person@example.com')
  expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('')
  expect(fetchMock).not.toHaveBeenCalled()
})

it('previews all selected descendants in the issue outline format without overlapping duplicates', async () => {
  await dispatch(
    importToContext(`- aaa
  - =note
    - =favorite
  - bbb
- unrelated`),
  )
  await dispatch([
    setCursor(['aaa']),
    addMulticursor(['aaa']),
    addMulticursor(['aaa', 'bbb']),
    showModal({ id: 'feedback' }),
  ])
  await act(async () => {
    fireEvent.click(screen.getByRole('checkbox', { name: 'Attach my current selection' }))
    await vi.runAllTimersAsync()
  })
  expect(screen.getByLabelText('Selected thoughts preview').textContent).toBe(
    '- aaa\n  - =note\n    - =favorite\n  - bbb',
  )
})

it('previews an opted-in event log without the page URL or whole thoughtspace dump', async () => {
  debugLog.setEnabled(true)
  debugLog.log('example', { value: 'Private example text' })
  debugLog.setEnabled(false)
  await dispatch(showModal({ id: 'feedback' }))
  expect(screen.getByRole('checkbox', { name: 'Attach debug log' })).not.toBeChecked()
  await act(async () => {
    fireEvent.click(screen.getByRole('checkbox', { name: 'Attach debug log' }))
  })
  const text = screen.getByLabelText('Debug log preview').textContent!
  expect(text).toContain('Private example text')
  expect(text).not.toContain('--- url:')
  expect(text).not.toContain('--- state.thoughts:')
  expect(debugLog.isEnabled()).toBe(false)
})

it('retains a failed draft and reuses its submission identity on retry', async () => {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status: 429,
    json: async () => ({ error: 'Too many requests' }),
  } as Response)
  await dispatch(showModal({ id: 'feedback' }))
  await act(async () => {
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Keep this draft' } })
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await vi.dynamicImportSettled()
    await vi.runAllTimersAsync()
  })
  expect(screen.getByRole('alert')).toHaveTextContent('Too many requests')
  expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Keep this draft')
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await vi.dynamicImportSettled()
    await vi.runAllTimersAsync()
  })
  expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual(
    JSON.parse(fetchMock.mock.calls[1][1]!.body as string),
  )
})

it('uploads selected files privately before completing the submission', async () => {
  await dispatch(showModal({ id: 'feedback' }))
  const file = new File(['image'], 'example.png', { type: 'image/png' })
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Add attachments'), { target: { files: [file] } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'See screenshot' } })
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await vi.dynamicImportSettled()
    await vi.runAllTimersAsync()
  })
  expect(upload).toHaveBeenCalledOnce()
  expect(upload).toHaveBeenCalledWith(
    expect.stringMatching(/^feedback\/.+\/0$/),
    file,
    expect.objectContaining({ access: 'private', contentType: 'image/png' }),
  )
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/complete$/)
})

it('rejects unsupported attachments and disables thought attachment without a selection', async () => {
  await dispatch(setCursor(null))
  await dispatch(showModal({ id: 'feedback' }))
  expect(screen.getByRole('checkbox', { name: 'Attach my current selection' })).toBeDisabled()
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Add attachments'), { target: { files: [new File(['x'], 'run.exe')] } })
  })
  expect(screen.getByRole('alert')).toHaveTextContent('Choose an image, text/log, JSON, or PDF file.')
  expect(screen.queryByRole('button', { name: 'Remove run.exe' })).not.toBeInTheDocument()
})
