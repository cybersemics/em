import { screen } from '@testing-library/dom'
import importText from '../../action-creators/importText'
import toggleHiddenThoughtsActionCreator from '../../action-creators/toggleHiddenThoughts'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it.skip('Superscript should count all the contexts in which it is defined.', async () => {
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

it.skip('Superscript should not count archived contexts', async () => {
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

it('Superscript should not count for hashed version of metaprogramming attributes like =archive | archive', async () => {
  store.dispatch([
    importText({
      text: `
      - a
        - =archive
      - b
        - Archive`,
    }),
    toggleHiddenThoughtsActionCreator(),
  ])

  expect(() => screen.getByText('2')).toThrow('Unable to find an element')
})
