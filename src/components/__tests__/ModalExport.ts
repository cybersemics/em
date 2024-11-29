import { screen } from '@testing-library/dom'
import { act } from 'react'
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
