import {
  findAllByLabelText,
  findByLabelText,
  findByRole,
  queryByLabelText,
  queryByText,
  screen,
} from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import globals from '../../globals'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import findAllThoughtsByText from '../../test-helpers/queries/findAllThoughtsByText'
import findSubthoughts from '../../test-helpers/queries/findSubthoughts'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import queryThoughtByText from '../../test-helpers/queries/queryThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import series from '../../util/series'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('Clicking a context moves the cursor to that context', async () => {
  await dispatch([
    importText({
      text: `
          - a1
            - a2
              - a3
                - m
                  - x
          - b1
            - b2
              - b3
                - m
                  - y
      `,
    }),
    setCursor(['a1', 'a2', 'a3', 'm']),
    toggleContextView(),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  // select each context in the context view
  const contextBreadcrumbs = document.querySelectorAll('[aria-label="context-breadcrumbs"]')

  // find the context that contains b2 (ignoring context order)
  const contextLink = (
    await Promise.all(
      Array.from(contextBreadcrumbs).map(async el => queryByText(el as HTMLElement, 'b2', { exact: true })),
    )
  ).find(Boolean)!

  expect(contextLink).toBeTruthy()

  // click the context link
  const user = userEvent.setup({ delay: null })
  await user.click(contextLink)

  await act(vi.runOnlyPendingTimersAsync)

  // cursor should exist
  const cursor = store.getState().cursor!
  expect(cursor).toBeTruthy()

  // cursor should be on the context that was clicked
  const state = store.getState()
  expectPathToEqual(state, state.cursor, ['b1', 'b2'])
})

it('render home icon as breadcrumbs for each context whose parent is the home context', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - m
        - b
          - m
      `,
    }),
    setCursor(['a', 'm']),
    toggleContextView(),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const tree = screen.getAllByLabelText('tree-node').map(node => {
    const breadcrumbs = queryByLabelText(node, 'context-breadcrumbs')
    return {
      value: queryByLabelText(node, 'thought')?.textContent,
      homeBreadcrumbs: !!breadcrumbs && !!queryByLabelText(breadcrumbs, 'home'),
    }
  })

  // The contexts a and b are both direct children of the home context, so each renders the home icon as its breadcrumbs.
  expect(tree).toEqual([
    { value: 'a', homeBreadcrumbs: false },
    { value: 'm', homeBreadcrumbs: false },
    { value: 'a', homeBreadcrumbs: true },
    { value: 'b', homeBreadcrumbs: true },
    { value: 'b', homeBreadcrumbs: false },
  ])
})

describe('freeThoughts', () => {
  // Mock freeThoughtsThreshold to 0 so freeThoughts deallocates any thought that is not explicitly preserved.
  const freeThoughtsThreshold = globals.freeThoughtsThreshold
  beforeEach(() => {
    globals.freeThoughtsThreshold = 0
  })
  afterEach(() => {
    globals.freeThoughtsThreshold = freeThoughtsThreshold
  })

  it('Do not deallocate tangential contexts children', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - m
          - d
            - e
              - f
                - m
                  - y
                    - y1
                  - z
                    - z1
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    // Wait for freeThoughts to run before moving the cursor to a/m~/f.
    // Do not dispatch setCursor in the same batch.
    // Otherwise the new state.expanded will incidentally preserve y1 and z1, resulting in a false negative
    await dispatch([setCursor(['a', 'm', 'f'])])

    await act(vi.runOnlyPendingTimersAsync)

    // Wait for a/m~/f/y to be visible
    const y1 = await findThoughtByText('y')
    expect(y1).toBeTruthy()

    // Assert that there are no pending thoughts
    expect(document.querySelectorAll('[data-pending=true]').length).toBe(0)
  })
})

describe('render', () => {
  it('show all the contexts in which a thought exists', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - m
          - b
            - m
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const contexts = await findSubthoughts('m')

    const contextValues = await series(
      contexts.map(context => async () => (await findByLabelText(context, 'thought')).textContent),
    )

    expect(contextValues).toEqual(['a', 'b'])
  })

  it('do not expand contexts when cursor is on the context view', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    expect(await queryThoughtByText('x')).toBeNull()
    expect(await queryThoughtByText('y')).toBeNull()
  })

  it('expand cursor on a cyclic context (the context on which the context view is activated)', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
      setCursor(['a', 'm', 'a']),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    expect(await findThoughtByText('x')).toBeTruthy()
    expect(await queryThoughtByText('y')).toBeNull()
  })

  it('expand cursor on a tangential context (from a different part of the hierarchy)', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
      setCursor(['a', 'm', 'b']),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    expect(await findThoughtByText('y')).toBeTruthy()
    expect(await queryThoughtByText('x')).toBeNull()
  })

  it('show instructions when thought exists in not found in any other contexts', async () => {
    await dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursor(['a']),
      toggleContextView(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    // only search for first part of text since the whole text consists of several text nodes
    const instructions = await screen.findAllByText('This thought is not found in any other contexts', { exact: false })
    expect(instructions).toHaveLength(1)
  })

  it('change bullet to no fill', async () => {
    await dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursor(['a']),
      toggleContextView(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const bulletGlyph = (await findThoughtByText('a'))!.closest('[aria-label="child"]')!.querySelector('[data-bullet]')
    expect(bulletGlyph).toHaveAttribute('fill', 'none')
  })

  it('show breadcrumbs for each thought context', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - b
              - m
                - x
          - c
            - d
              - e
                - m
                  - y
        `,
      }),
      setCursor(['a', 'b', 'm']),
      toggleContextView(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const contexts = await findSubthoughts('m')

    expect(await findByLabelText(contexts[0], 'context-breadcrumbs')).toHaveTextContent('a')
    expect(await findByLabelText(contexts[1], 'context-breadcrumbs')).toHaveTextContent('c • d')
  })

  it('render home icon as thought for each thought in the home context', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - b
              - m
          - m
        `,
      }),
      setCursor(['a', 'b', 'm']),
      toggleContextView(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const contexts = await findSubthoughts('m')

    // the home context renders the home icon in place of the thought
    const thoughtHome = await findByLabelText(contexts[0], 'thought')
    expect(await findAllByLabelText(thoughtHome, 'home')).toHaveLength(1)

    // the a/b context renders b as the thought
    const thoughtB = await findByLabelText(contexts[1], 'thought')
    expect(queryByLabelText(thoughtB, 'home')).toBeNull()
    expect(thoughtB).toHaveTextContent('b')
  })

  it('render correct superscript on contexts', async () => {
    await dispatch([
      importText({
        /*

        Superscripts:

        - m: 2
        - a: 3
        - b: 4

        */

        text: `
          - a
            - m
              - x
          - b
            - m
          - c
            - a
            - b
          - d
            - a
            - b
          - e
            - b
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const contexts = await findSubthoughts('m')

    expect(await findByRole(contexts[0], 'superscript')).toHaveTextContent('3')
    expect(await findByRole(contexts[1], 'superscript')).toHaveTextContent('4')
  })

  it('sort contexts by ancestors (breadcrumbs)', async () => {
    await dispatch([
      importText({
        text: `
          - b
            - b1
              - m
          - a
            - a1
              - m
        `,
      }),
      setCursor(['b', 'b1', 'm']),
      toggleContextView(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const contexts = await findSubthoughts('m')

    // get the textContent of each context's breadcrumbs in order
    const breadcrumbsText = await series(
      contexts.map(context => async () => (await findByLabelText(context, 'context-breadcrumbs')).textContent),
    )

    expect(breadcrumbsText).toEqual(['a', 'b'])
  })

  it('sort contexts by ancestors with different depths', async () => {
    await dispatch([
      importText({
        text: `
          - c
            - a1
              - m
          - b
            - x
              - m
          - a
            - d
              - g
                - m
              - e
                - f
                  - m
        `,
      }),
      setCursor(['c', 'a1', 'm']),
      toggleContextView(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const contexts = await findSubthoughts('m')

    // get the textContent of each context's breadcrumbs in order
    const breadcrumbsText = await series(
      contexts.map(context => async () => (await findByLabelText(context, 'context-breadcrumbs')).textContent),
    )

    expect(breadcrumbsText).toEqual(['a • d', 'a • d • e', 'b', 'c'])
  })

  it('sort contexts within the same ancestor by value', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - b
              - d
                - m
              - c
                - m
        `,
      }),
      setCursor(['a', 'b', 'd', 'm']),
      toggleContextView(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const contexts = await findSubthoughts('m')

    // get the textContent of each context in order
    const contextValues = await series(
      contexts.map(context => async () => (await findByLabelText(context, 'thought')).textContent),
    )

    expect(contextValues).toEqual(['c', 'd'])
  })

  it('Expand grandchildren of contexts', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - m
              - x
                - x1
          - b
            - m
              - y
                - y1
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
      setCursor(['a', 'm', 'a', 'x']),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    expect(await findThoughtByText('x1')).toBeTruthy()
  })
})

describe('editing', () => {
  it('edit a context', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - m
          - b
            - m
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const contexts = await findSubthoughts('m')
    const thoughtA = (await findThoughtByText('a', contexts[0]))!

    const user = userEvent.setup({ delay: null })
    await user.click(thoughtA)

    await act(vi.runAllTimersAsync)

    // jsdom leaves the caret at offset 0, so the typed character is prepended
    await user.type(thoughtA, 'z')

    await act(vi.runAllTimersAsync)

    // a context is the thought itself, so renaming it renames the thought everywhere it is rendered:
    // once in the tree and once as a context of m
    expect(await findAllThoughtsByText('za')).toHaveLength(2)
    expect(await queryThoughtByText('a')).toBeNull()

    // the other context is untouched
    expect(await findAllThoughtsByText('b')).toHaveLength(2)
  })
})
