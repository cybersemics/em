import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { act } from 'react'
import { closeModalActionCreator as closeModal } from '../../actions/closeModal'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleHiddenThoughtsActionCreator } from '../../actions/toggleHiddenThoughts'
import { tutorialActionCreator as tutorial } from '../../actions/tutorial'
import getLexeme from '../../selectors/getLexeme'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp, refreshTestApp } from '../../test-helpers/createTestApp'
import deferred from '../../test-helpers/deferred'
import dispatch from '../../test-helpers/dispatch'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'

vi.mock('@treecrdt/wa-sqlite', async importOriginal => {
  const actual = await importOriginal<typeof import('@treecrdt/wa-sqlite')>()
  return { ...actual, createTreecrdtClient: vi.fn(actual.createTreecrdtClient) }
})

const profilerOnRender = vi.fn()

beforeEach(async () => {
  profilerOnRender.mockClear()
  await createTestApp({ profilerOnRender })
})

afterEach(async () => {
  vi.restoreAllMocks()
  await cleanupTestApp()
})

it('does not render again when persistence confirms the optimistic edit unchanged', async () => {
  await dispatch(importText({ text: '- parent\n  - at\n  - cat' }))
  await dispatch(setCursor(['parent', 'at']))
  await act(waitForThoughtspaceIdle)
  await act(vi.runAllTimersAsync)

  const client = await vi.mocked(createTreecrdtClient).mock.results.at(-1)!.value
  const started = deferred()
  const released = deferred()
  const payload = client.local.payload.bind(client.local)
  vi.spyOn(client.local, 'payload').mockImplementationOnce(async (...args) => {
    started.resolve()
    await released.promise
    return payload(...args)
  })

  const editable = (await findThoughtByText('at'))!
  await userEvent.setup({ delay: null }).type(editable, 'c')
  await act(vi.runAllTimersAsync)
  await started.promise
  const optimisticText = editable.textContent
  const optimisticCounts = screen.getAllByRole('superscript').map(element => element.textContent)
  profilerOnRender.mockClear()

  await act(async () => {
    released.resolve()
    await waitForThoughtspaceIdle()
    await vi.runAllTimersAsync()
  })

  expect(optimisticText).toBe('cat')
  expect(optimisticCounts).toEqual(['2', '2'])
  expect(editable).toHaveTextContent('cat')
  expect(profilerOnRender).not.toHaveBeenCalled()
})

it('renders the superscript when confirmation discovers an unloaded occurrence', async () => {
  await dispatch(importText({ text: '- other\n  - branch\n    - hidden\n      - cat\n- at' }))
  await refreshTestApp()
  await dispatch([tutorial({ value: false }), closeModal(), setCursor(['at'])])
  await act(vi.runAllTimersAsync)
  await act(waitForThoughtspaceIdle)
  expect(getLexeme(store.getState(), 'cat')).toBeUndefined()

  const client = await vi.mocked(createTreecrdtClient).mock.results.at(-1)!.value
  const started = deferred()
  const released = deferred()
  const payload = client.local.payload.bind(client.local)
  vi.spyOn(client.local, 'payload').mockImplementationOnce(async (...args) => {
    started.resolve()
    await released.promise
    return payload(...args)
  })

  const editable = (await findThoughtByText('at'))!
  await userEvent.setup({ delay: null }).type(editable, 'c')
  await act(vi.runAllTimersAsync)
  await started.promise
  const optimisticText = editable.textContent
  const optimisticSuperscript = screen.queryByRole('superscript')
  profilerOnRender.mockClear()

  await act(async () => {
    released.resolve()
    await waitForThoughtspaceIdle()
    await vi.runAllTimersAsync()
  })

  expect(optimisticText).toBe('cat')
  expect(optimisticSuperscript).toBeNull()
  expect(screen.getByRole('superscript')).toHaveTextContent('2')
  expect(profilerOnRender).toHaveBeenCalled()
})

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
