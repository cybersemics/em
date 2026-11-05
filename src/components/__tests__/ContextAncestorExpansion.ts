import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import findAllThoughtsByText from '../../test-helpers/queries/findAllThoughtsByText'
import findCursor from '../../test-helpers/queries/findCursor'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('uncollapses from the clicked breadcrumb while retaining its earlier prefix and revealing the real siblings', async () => {
  await dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Outside
  - District
    - Park
      - Garden
        - m
          - target detail
        - Daffodils
    - Dog park
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  await act(vi.runAllTimersAsync)
  const user = userEvent.setup({ delay: null })

  await user.click(screen.getByRole('button', { name: 'Uncollapse District' }))
  await act(vi.runAllTimersAsync)

  expect(screen.getByRole('button', { name: 'Uncollapse Outside' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Uncollapse District' })).toBeNull()
  expect(await findThoughtByText('District')).toBeVisible()
  expect(await findThoughtByText('Park')).toBeVisible()
  expect(await findThoughtByText('Garden')).toBeVisible()
  expect(await findThoughtByText('Daffodils')).toBeVisible()
  expect(await findThoughtByText('Dog park')).toBeVisible()
  expect(await findAllThoughtsByText('m')).toHaveLength(2)
  expect(await findCursor()).toHaveTextContent('District')
})
