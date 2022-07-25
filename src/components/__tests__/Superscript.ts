import { screen } from '@testing-library/dom'
import importText from '../../action-creators/importText'
import toggleHiddenThoughtsActionCreator from '../../action-creators/toggleHiddenThoughts'
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

it('Superscript should not render on thoughts in a single context', async () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c
      `,
    }),
  ])

  expect(() => screen.getByText('1')).toThrow('Unable to find an element')
})

it('Superscript should not render on empty thoughts', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - ${''}
        - b
          - ${''}
      `,
    }),
  ])

  expect(() => screen.getByText('2')).toThrow('Unable to find an element')
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

it('Superscript should not render on punctuation-only thoughts', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - .
          - ..
          - ...
          - …
          - :
          - ::
          - *
          - +
          - -
          - –
          - —
        - b
          - .
          - ..
          - ...
          - …
          - :
          - ::
          - *
          - -
          - –
          - —
      `,
    }),
  ])

  expect(() => screen.getByText('2')).toThrow('Unable to find an element')
  expect(() => screen.getByText('3')).toThrow('Unable to find an element')
  expect(() => screen.getByText('4')).toThrow('Unable to find an element')
  expect(() => screen.getByText('5')).toThrow('Unable to find an element')
})

it('Superscript should not render on punctuation-only thoughts with HTML', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - <i>...</i>
        - b
          - <i>...</i>
      `,
    }),
  ])

  expect(() => screen.getByText('2')).toThrow('Unable to find an element')
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
