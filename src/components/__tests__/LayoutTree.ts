import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import queryThoughtByText from '../../test-helpers/queries/queryThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(async () => {
  vi.restoreAllMocks()
  await cleanupTestApp()
})

it('unmount TreeNodes on collapse', async () => {
  await dispatch(
    importText({
      text: `
        - a
          - b
        - c
      `,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

  // a is initially collapsed because cursor is set to c after import
  expect(document.querySelectorAll('[aria-label="tree-node"]').length).toBe(2)

  await dispatch(setCursor(['a']))

  // expand a
  expect(document.querySelectorAll('[aria-label="tree-node"]').length).toBe(3)

  await dispatch(setCursor(['c']))
  await act(vi.runOnlyPendingTimersAsync)

  // collapse a and unmount b
  expect(document.querySelectorAll('[aria-label="tree-node"]').length).toBe(2)
})

it('unmounts distant thoughts after navigation and remounts them on return', async () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 20))

  await dispatch(
    importText({
      text: `
        - a
          - b
            - c
              - d
                - e
                  - f
                    - g
      `,
    }),
  )

  await dispatch(setCursor(['a']))
  expect(await queryThoughtByText('a')).not.toBeNull()

  await dispatch(setCursor(['a', 'b', 'c', 'd', 'e', 'f']))
  await act(vi.runOnlyPendingTimersAsync)

  expect(await queryThoughtByText('a')).toBeNull()
  // hide-parent thoughts stay mounted so they can fade back in when navigating up.
  expect(await queryThoughtByText('d')).not.toBeNull()
  expect(await queryThoughtByText('f')).not.toBeNull()

  await dispatch(setCursor(['a']))
  expect(await queryThoughtByText('a')).not.toBeNull()
})
