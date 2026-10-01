import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import Thought from '../../@types/Thought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { updateThoughtsActionCreator as updateThoughts } from '../../actions/updateThoughts'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('Export a single thought', async () => {
  await dispatch([
    importText({
      text: `
        - a
      `,
    }),
  ])

  await dispatch(showModal({ id: 'export' }))

  await act(vi.runOnlyPendingTimersAsync)

  // The complete export is available when the modal renders.
  await screen.findByLabelText('copy-clipboard-btn')
  const exportPhraseElement = screen.getByTestId('export-phrase-container')
  expect(exportPhraseElement.textContent).toEqual('Download "a" as Plain Text')
})

it('Export a couple thoughts', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - b
      `,
    }),
  ])

  await dispatch(showModal({ id: 'export' }))

  await act(vi.runOnlyPendingTimersAsync)

  await screen.findByLabelText('copy-clipboard-btn')
  const exportPhraseElement = screen.getByTestId('export-phrase-container')
  expect(exportPhraseElement.textContent).toEqual('Download "a" and 1 subthought as Plain Text')
})

it('Export the cursor and all descendants', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - b
            - c
      `,
    }),
    setCursor(['a', 'b']),
    showModal({ id: 'export' }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  await screen.findByLabelText('copy-clipboard-btn')
  const exportPhraseElement = screen.getByTestId('export-phrase-container')
  expect(exportPhraseElement.textContent).toEqual('Download "b" and 1 subthought as Plain Text')
})

it('Export every descendant without navigating into the subtree', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - b
            - c
              - d
                - e
        - x
      `,
    }),
    setCursor(null),
  ])

  act(() => store.dispatch([showModal({ id: 'export' })]))

  await act(vi.runOnlyPendingTimersAsync)

  await screen.findByLabelText('copy-clipboard-btn')
  const exportPhraseElement = screen.getByTestId('export-phrase-container')

  expect(exportPhraseElement.textContent).toEqual('Download all 6 thoughts as Plain Text')
})

it('exports only the selected subtree in a JSON snapshot', async () => {
  await dispatch([
    importText({ text: '- selected\n  - child\n    - grandchild\n- unrelated' }),
    setCursor(['selected']),
    showModal({ id: 'export' }),
  ])

  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await user.click(screen.getByText('Plain Text', { exact: true }))
  await user.click(screen.getByText('JSON Snapshot', { exact: true }))

  const exported = JSON.parse(
    (screen.getByRole('textbox', { name: 'Export preview' }) as HTMLTextAreaElement).value,
  ) as Record<string, Partial<Thought>>
  expect(Object.values(exported).map(thought => thought.value)).toEqual(['selected', 'child', 'grandchild'])
  expect(Object.values(exported)).not.toContainEqual(expect.objectContaining({ value: 'Settings' }))
  expect(Object.values(exported)).not.toContainEqual(expect.objectContaining({ value: 'unrelated' }))
})

it('exports document values without transient generation overlays', async () => {
  await dispatch([importText({ text: '- selected\n  - child' }), setCursor(['selected'])])
  const thought = contextToThought(store.getState(), ['selected'])!
  await dispatch([
    updateThoughts({
      thoughtIndexUpdates: {
        [thought.id]: { ...thought, generating: true, displayValue: 'Generating…', splitSource: thought.id },
      },
      persist: false,
    }),
    showModal({ id: 'export' }),
  ])

  const preview = screen.getByRole('textbox', { name: 'Export preview' }) as HTMLTextAreaElement
  expect(preview.value).toContain('selected')
  expect(preview.value).not.toContain('Generating…')

  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await user.click(screen.getByText('Plain Text', { exact: true }))
  await user.click(screen.getByText('JSON Snapshot', { exact: true }))

  const exported = JSON.parse(preview.value) as Record<string, Partial<Thought>>
  expect(exported[thought.id].value).toBe('selected')
  for (const entry of Object.values(exported)) {
    expect(entry).not.toHaveProperty('generating')
    expect(entry).not.toHaveProperty('displayValue')
    expect(entry).not.toHaveProperty('splitSource')
  }
})
