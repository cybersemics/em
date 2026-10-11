import { screen } from '@testing-library/dom'
import { act } from 'react'
import { archiveThoughtActionCreator as archiveThought } from '../../actions/archiveThought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import store from '../../stores/app'
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

  // get the first match since there is a Download button also
  const exportPhraseElement = (await screen.findAllByText('Download'))[0]
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

  // get the first match since there is a Download button also
  const exportPhraseElement = (await screen.findAllByText('Download'))[0]
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

  // get the first match since there is a Download button also
  const exportPhraseElement = (await screen.findAllByText('Download'))[0]
  expect(exportPhraseElement.textContent).toEqual('Download "b" and 1 subthought as Plain Text')
})

it('Export buffered thoughts', async () => {
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

  // get the first match since there is a Download button also
  const exportPhraseElement = await screen.findByTestId('export-phrase-container')

  expect(exportPhraseElement.textContent).toEqual('Download all 6 thoughts as Plain Text')
})

// https://github.com/cybersemics/em/issues/4078
it('Show a message instead of the root when all thoughts are archived', async () => {
  await dispatch([
    importText({
      text: `
        - a
      `,
    }),
    setCursor(['a']),
    archiveThought({}),
    setCursor(null),
    showModal({ id: 'export' }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(screen.getByRole('textbox')).toHaveValue('')
  expect(
    screen.getByText(
      'There are no unarchived thoughts to download. Archived thoughts can be included in the Advanced settings.',
    ),
  ).toBeInTheDocument()
})

// https://github.com/cybersemics/em/issues/4078
it('Disable the export button and hide Copy to clipboard when there is nothing to export', async () => {
  await dispatch([
    importText({
      text: `
        - a
      `,
    }),
    setCursor(['a']),
    archiveThought({}),
    setCursor(null),
    showModal({ id: 'export' }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled()
  expect(screen.queryByLabelText('copy-clipboard-btn')).not.toBeInTheDocument()
})
