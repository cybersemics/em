import { screen } from '@testing-library/dom'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import store from '../../stores/app'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { editThoughtByContextActionCreator as editThoughtByContext } from '../../test-helpers/editThoughtByContext'
import getDescendantsOfContext from '../../test-helpers/queries/getDescendantsOfContext'
import getThoughtByContext from '../../test-helpers/queries/getThoughtByContext'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('home: Asc', async () => {
  act(() => {
    store.dispatch([
      importText({
        text: `
              - c
              - a
              - b
            `,
      }),
      setCursor(['a']),
    ])
  })

  await act(vi.runOnlyPendingTimersAsync)

  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await click('[aria-label="sort options"] [aria-label="Alphabetical"]')
  await act(vi.runAllTimersAsync)

  const thoughtC = getThoughtByContext(['c'])
  expect(thoughtC).toBeTruthy()

  const thoughts = screen.getAllByTestId(/thought/)

  expect(thoughts.map((child: HTMLElement) => child.textContent)).toMatchObject(['a', 'b', 'c'])
})

it('subthoughts: Asc', async () => {
  act(() => {
    store.dispatch([
      importText({
        text: `
              - a
                - 3
                - 1
                - 2
            `,
      }),
      setCursor(['a', '3']),
    ])
  })

  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await click('[aria-label="sort options"] [aria-label="Alphabetical"]')
  await act(vi.runOnlyPendingTimersAsync)

  const thought = getThoughtByContext(['a'])
  expect(thought).toBeTruthy()

  const subthoughtsOfA = getDescendantsOfContext(['a'])

  expect(subthoughtsOfA.map((child: HTMLElement) => child.textContent)).toMatchObject(['1', '2', '3'])
})

it('home: Desc', async () => {
  act(() => {
    store.dispatch([
      importText({
        text: `
              - =sort
                - Alphabetical
              -c
              -a
              -b`,
      }),

      setCursor(['a']),
    ])
  })
  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await click('[aria-label="sort options"] [aria-label="Alphabetical"]')
  await act(vi.runAllTimersAsync)

  const thought = getThoughtByContext(['c'])
  expect(thought).toBeTruthy()

  const thoughts = screen.getAllByTestId(/thought/)

  expect(thoughts.map((child: HTMLElement) => child.textContent)).toMatchObject(['c', 'b', 'a'])
})

it('subthoughts: Desc', async () => {
  act(() => {
    store.dispatch([
      importText({
        text: `
              - a
                - 3
                - 1
                - 2
            `,
      }),
      setCursor(['a', '3']),
    ])
  })

  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await click('[aria-label="sort options"] [aria-label="Alphabetical"]')

  await act(vi.runOnlyPendingTimersAsync)
  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await click('[aria-label="sort options"] [aria-label="Alphabetical"]')

  await act(vi.runAllTimersAsync)

  const thoughtA = getThoughtByContext(['a'])
  expect(thoughtA).toBeTruthy()

  const subthoughtsOfA = getDescendantsOfContext(['a'])

  expect(subthoughtsOfA.map((child: HTMLElement) => child.textContent)).toMatchObject(['3', '2', '1'])
})

it('home: Created Asc', async () => {
  // Import initial thought 'a'
  act(() => {
    store.dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursor(['a']),
    ])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought 'b'
  act(() => {
    store.dispatch([newThought({ value: 'b' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought 'c'
  act(() => {
    store.dispatch([newThought({ value: 'c' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Click sort picker and select Created sort
  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await act(vi.runOnlyPendingTimersAsync)
  await click('[aria-label="sort options"] [aria-label="Created"]')
  await act(vi.runOnlyPendingTimersAsync)

  // Get all thoughts in order
  const thoughts = screen.getAllByTestId(/thought/)
  const thoughtValues = thoughts.map(t => t.textContent)

  // Verify thoughts are sorted by creation time ascending (a, b, c)
  expect(thoughtValues).toMatchObject(['a', 'b', 'c'])
})

it('subthoughts: Created Asc', async () => {
  act(() => {
    store.dispatch([
      importText({
        text: `
              - a
                - 3              
            `,
      }),
      setCursor(['a', '3']),
    ])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought '1'
  act(() => {
    store.dispatch([newThought({ value: '1' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought '2'
  act(() => {
    store.dispatch([newThought({ value: '2' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await click('[aria-label="sort options"] [aria-label="Created"]')
  await act(vi.runOnlyPendingTimersAsync)

  const thought = getThoughtByContext(['a'])
  expect(thought).toBeTruthy()

  const subthoughtsOfA = getDescendantsOfContext(['a'])

  expect(subthoughtsOfA.map((child: HTMLElement) => child.textContent)).toMatchObject(['3', '1', '2'])
})

it('home: Created Desc', async () => {
  // Import initial thought 'a'
  act(() => {
    store.dispatch([
      importText({
        text: `
          - =sort
            - Created
          - a
        `,
      }),
      setCursor(['a']),
    ])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought 'b'
  act(() => {
    store.dispatch([newThought({ value: 'b' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought 'c'
  act(() => {
    store.dispatch([newThought({ value: 'c' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Click sort picker and select Created sort
  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await click('[aria-label="sort options"] [aria-label="Created"]')
  await act(vi.runOnlyPendingTimersAsync)

  // Get all thoughts in order
  const thoughts = screen.getAllByTestId(/thought/)
  const thoughtValues = thoughts.map(t => t.textContent)

  // Verify thoughts are sorted by creation time descending (c, b, a)
  expect(thoughtValues).toMatchObject(['c', 'b', 'a'])
})

it('subthoughts: Created Desc', async () => {
  act(() => {
    store.dispatch([
      importText({
        text: `
              - a
                - =sort
                  - Created
                - 3
            `,
      }),
      setCursor(['a', '3']),
    ])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought '1'
  act(() => {
    store.dispatch([newThought({ value: '1' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought '2'
  act(() => {
    store.dispatch([newThought({ value: '2' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await click('[aria-label="sort options"] [aria-label="Created"]')
  await act(vi.runOnlyPendingTimersAsync)

  const thought = getThoughtByContext(['a'])
  expect(thought).toBeTruthy()

  const subthoughtsOfA = getDescendantsOfContext(['a'])

  expect(subthoughtsOfA.map((child: HTMLElement) => child.textContent)).toMatchObject(['2', '1', '3'])
})

it('home: Updated Asc', async () => {
  // Import initial thought 'a'
  act(() => {
    store.dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursor(['a']),
    ])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought 'b'
  act(() => {
    store.dispatch([newThought({ value: 'b' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought 'c'
  act(() => {
    store.dispatch([newThought({ value: 'c' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Edit thought 'b' to 'd'
  act(() => {
    store.dispatch([editThoughtByContext(['b'], 'd')])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Click sort picker and select Updated sort
  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await click('[aria-label="sort options"] [aria-label="Updated"]')
  await act(vi.runOnlyPendingTimersAsync)

  // Get all thoughts in order
  const thoughts = screen.getAllByTestId(/thought/)
  const thoughtValues = thoughts.map(t => t.textContent)

  // Verify thoughts are sorted by update time ascending (a, c, d)
  // d is last because it was edited most recently
  expect(thoughtValues).toMatchObject(['a', 'c', 'd'])
})

it('subthoughts: Updated Asc', async () => {
  act(() => {
    store.dispatch([
      importText({
        text: `
              - a
                - 3
            `,
      }),
      setCursor(['a', '3']),
    ])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought '1'
  act(() => {
    store.dispatch([newThought({ value: '1' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought '2'
  act(() => {
    store.dispatch([newThought({ value: '2' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Edit thought '1' to '4'
  act(() => {
    store.dispatch([editThoughtByContext(['a', '1'], '4')])
  })

  await act(vi.runOnlyPendingTimersAsync)

  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await click('[aria-label="sort options"] [aria-label="Updated"]')
  await act(vi.runOnlyPendingTimersAsync)

  const thought = getThoughtByContext(['a'])
  expect(thought).toBeTruthy()

  const subthoughtsOfA = getDescendantsOfContext(['a'])

  expect(subthoughtsOfA.map((child: HTMLElement) => child.textContent)).toMatchObject(['3', '2', '4'])
})

it('home: Updated Desc', async () => {
  // Import initial thought 'a'
  act(() => {
    store.dispatch([
      importText({
        text: `
          - =sort
            - Updated
          - a
        `,
      }),
      setCursor(['a']),
    ])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought 'b'
  act(() => {
    store.dispatch([newThought({ value: 'b' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought 'c'
  act(() => {
    store.dispatch([newThought({ value: 'c' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Edit thought 'b' to 'd'
  act(() => {
    store.dispatch([editThoughtByContext(['b'], 'd')])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Click sort picker and select Updated sort
  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await click('[aria-label="sort options"] [aria-label="Updated"]')
  await act(vi.runOnlyPendingTimersAsync)

  // Get all thoughts in order
  const thoughts = screen.getAllByTestId(/thought/)
  const thoughtValues = thoughts.map(t => t.textContent)

  // Verify thoughts are sorted by update time ascending (d, c, a)
  // d is last because it was edited most recently
  expect(thoughtValues).toMatchObject(['d', 'c', 'a'])
})

it('subthoughts: Updated Desc', async () => {
  act(() => {
    store.dispatch([
      importText({
        text: `
              - a
                - =sort
                  - Updated
                - 3
            `,
      }),
      setCursor(['a', '3']),
    ])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought '1'
  act(() => {
    store.dispatch([newThought({ value: '1' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Create thought '2'
  act(() => {
    store.dispatch([newThought({ value: '2' })])
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Edit thought '1' to '4'
  act(() => {
    store.dispatch([editThoughtByContext(['a', '1'], '4')])
  })

  await act(vi.runOnlyPendingTimersAsync)

  await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
  await click('[aria-label="sort options"] [aria-label="Updated"]')
  await act(vi.runOnlyPendingTimersAsync)

  const thought = getThoughtByContext(['a'])
  expect(thought).toBeTruthy()

  const subthoughtsOfA = getDescendantsOfContext(['a'])

  expect(subthoughtsOfA.map((child: HTMLElement) => child.textContent)).toMatchObject(['4', '2', '3'])
})
