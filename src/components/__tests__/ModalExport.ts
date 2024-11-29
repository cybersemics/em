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

// TODO: replicateThought is returning undefined. Either replication is broken in the tests or it is a timing issue.
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

// TODO
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

// TODO
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

// unable to figure out timer issues
// it either doesn't wait for the push to resolve, or it goes into an infinite loop
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

  // await refreshTestApp()

  await store.dispatch([showModal({ id: 'export' })])

  await act(vi.runOnlyPendingTimersAsync)

  // get the first match since there is a Download button also
  const exportPhraseElement = (await screen.findAllByText('Download'))[0]
  await screen.findAllByText('Download')
  expect(exportPhraseElement.textContent).toEqual('Download all 6 thoughts as Plain Text')
})
