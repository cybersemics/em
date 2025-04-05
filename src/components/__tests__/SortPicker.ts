import { screen } from '@testing-library/dom'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import store from '../../stores/app'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
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
  await act(() => vi.runAllTimersAsync())

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
  await act(() => vi.runOnlyPendingTimersAsync())

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
  await act(() => vi.runAllTimersAsync())

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

  await act(() => vi.runAllTimersAsync())

  const thoughtA = getThoughtByContext(['a'])
  expect(thoughtA).toBeTruthy()

  const subthoughtsOfA = getDescendantsOfContext(['a'])

  expect(subthoughtsOfA.map((child: HTMLElement) => child.textContent)).toMatchObject(['3', '2', '1'])
})

// it('move cursor to previous sibling', () => {
//   const steps = [
//     newThought('a'),
//     newThought('b'),
//     newThought('c'),
//     setSortPreference({
//       simplePath: HOME_PATH,
//       sortPreference: {
//         type: 'Created',
//         direction: 'Desc',
//       },
//     }),
//   ]

//   const stateNew = reducerFlow(steps)(initialState())

//   const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

//   expect(exported).toBe(`- ${HOME_TOKEN}
//   - a
//   - b
//   - c
//   - =sort
//     - Created
//       - Desc
//   `)
// })
