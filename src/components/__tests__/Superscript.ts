import { screen } from '@testing-library/dom'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleHiddenThoughtsActionCreator } from '../../actions/toggleHiddenThoughts'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('Superscript should count all the contexts in which it is defined.', async () => {
  await dispatch([
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

  await act(vi.runOnlyPendingTimersAsync)

  const element = screen.getByText('3')
  expect(element.nodeName).toBe('SUP')
})

it('Superscript should use bold formatting from the thought.', async () => {
  await dispatch([
    importText({
      text: `
        - **a**
          - a
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const superscripts = screen.getAllByRole('superscript') as HTMLElement[]
  expect(superscripts[0].style.fontWeight).toBe('600')
  expect(superscripts[1].style.fontWeight).toBe('')
})

it('Superscript should only use whole-thought bold and italic formatting.', async () => {
  await dispatch([
    importText({
      text: `
        - <b><i><u><strike><code>a</code></strike></u></i></b>
          - a
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const superscript = screen.getAllByRole('superscript')[0] as HTMLElement
  expect(superscript.style.fontWeight).toBe('600')
  expect(superscript.style.fontStyle).toBe('italic')
  expect(superscript.style.fontFamily).toBe('')
  expect(superscript.style.textDecoration).toBe('')
})

it('Superscript should not render on thoughts in a single context', async () => {
  await dispatch([
    importText({
      text: `
        - a
        - b
        - c
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(() => screen.getByText('1')).toThrow('Unable to find an element')
})

it('Superscript should not render on empty thoughts', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - ${''}
        - b
          - ${''}
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(() => screen.getByText('2')).toThrow('Unable to find an element')
})

it('Superscript should not render on thoughts that match EM descendants', async () => {
  await dispatch([
    importText({
      text: `
        - on
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(screen.queryByRole('superscript')).not.toBeInTheDocument() // Unable to find an accessible element
})

it('Superscript should not render on punctuation-only thoughts', async () => {
  await dispatch([
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

  await act(vi.runOnlyPendingTimersAsync)

  expect(() => screen.getByText('2')).toThrow('Unable to find an element')
  expect(() => screen.getByText('3')).toThrow('Unable to find an element')
  expect(() => screen.getByText('4')).toThrow('Unable to find an element')
  expect(() => screen.getByText('5')).toThrow('Unable to find an element')
})

it('Superscript should not render on punctuation-only thoughts with HTML', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - <i>...</i>
        - b
          - <i>...</i>
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(() => screen.getByText('2')).toThrow('Unable to find an element')
})

it('Superscript should not count for hashed version of metaprogramming attributes like =archive | archive', async () => {
  await dispatch([
    importText({
      text: `
      - a
        - =archive
      - b
        - Archive`,
    }),
    toggleHiddenThoughtsActionCreator(),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(() => screen.getByText('2')).toThrow('Unable to find an element')
})
