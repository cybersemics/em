import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('apply =focus/Zoom/=style from a =let expression when the thought becomes the cursor', async () => {
  await dispatch([
    importText({
      text: `
        - =let
          - =foo
            - =focus
              - Zoom
                - =style
                  - color
                    - rgba(255, 192, 203, 1)
        - apple
          - =foo
        - bear
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const thoughtApple = (await findThoughtByText('apple'))!.closest('[aria-label="child"]')!
  expect(thoughtApple).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  const user = userEvent.setup({ delay: null })
  await user.click((await findThoughtByText('apple'))!)

  await act(vi.runOnlyPendingTimersAsync)

  expect((await findThoughtByText('apple'))!.closest('[aria-label="child"]')).toHaveStyle({
    color: 'rgba(255, 192, 203, 1)',
  })
})
