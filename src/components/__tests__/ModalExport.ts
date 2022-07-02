import { screen } from '@testing-library/dom'
import importText from '../../action-creators/importText'
import setCursor from '../../action-creators/setCursor'
import showModal from '../../action-creators/showModal'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import testTimer from '../../test-helpers/testTimer'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

const fakeTimer = testTimer()

it('Export a couple thoughts', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
      `,
    }),
    showModal({ id: 'export' }),
  ])

  // get the first match since there is a Download button also
  const exportPhraseElement = (await screen.findAllByText('Download'))[0]
  expect(exportPhraseElement.textContent).toEqual('Download "a" and 1 subthought as Plain Text')
})

it('Export the cursor and all descendants', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
      `,
    }),
    setCursorFirstMatchActionCreator(['a', 'b']),
    showModal({ id: 'export' }),
  ])

  // get the first match since there is a Download button also
  const exportPhraseElement = (await screen.findAllByText('Download'))[0]
  expect(exportPhraseElement.textContent).toEqual('Download "b" and 1 subthought as Plain Text')
})

// unable to figure out timer issues
// it either doesn't wait for the push to resolve, or it goes into an infinite loop
it.skip('Export buffered thoughts', async () => {
  fakeTimer.useFakeTimer()
  store.dispatch([
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
    setCursor({ path: null }),
  ])

  await fakeTimer.runAllAsync()

  // await refreshTestApp()

  store.dispatch([showModal({ id: 'export' })])

  await fakeTimer.runAllAsync()

  // get the first match since there is a Download button also
  const exportPhraseElement = (await screen.findAllByText('Download'))[0]
  await screen.findAllByText('Download')
  expect(exportPhraseElement.textContent).toEqual('Download all 6 thoughts as Plain Text')
})
