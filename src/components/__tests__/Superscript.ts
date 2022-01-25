import { screen } from '@testing-library/dom'
import { importText } from '../../action-creators'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('Superscript should count all the contexts in which it is defined.', async () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
          - c
        - d
          - c
        - e
          - f
            - c
      `,
    }),
  ])

  const element = screen.getByText('3')
  expect(element.nodeName).toBe('SUP')
})

it('Superscript should not count archived contexts', async () => {
  store.dispatch([
    importText({
      text: `
        - a
        - =archive
          - b
            - c
        - d
          - c
        - e
          - f
            - c
      `,
    }),
  ])

  const element = screen.getByText('2')
  expect(element.nodeName).toBe('SUP')
})
