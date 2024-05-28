import userEvent from '@testing-library/user-event'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import paste from '../../test-helpers/paste'
import { findThoughtByText } from '../../test-helpers/queries'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it.skip('define =focus/Zoom in a =let expression and apply it to a thought', async () => {
  paste(`
    - =let
      - =foo
        - =focus
          - Zoom
    - a
      - =foo
    - b
  `)

  // getComputedStyle is not working here for some reason
  // instead check the zoomCursor class

  // b should initially be visible
  const thoughtB = (await findThoughtByText('b'))!.closest('[aria-label="child"]')!
  const subthoughts = thoughtB.closest('.children')
  expect(subthoughts).not.toHaveClass('zoomCursor')

  // Set the cursor on `a`, wait for the animation to complete, then `a` should have the zoomCursor
  // TODO: Find a way to detect if b is actually hidden
  const thoughtA = (await findThoughtByText('a')) as HTMLElement
  userEvent.click(thoughtA)
  expect(subthoughts).toHaveClass('zoomCursor')
})

it.skip('=focus/Zoom/=style', async () => {
  paste(`
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
  `)

  const thoughtA = (await findThoughtByText('apple'))!.closest('[aria-label="child"]')!
  expect(thoughtA).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  userEvent.click(thoughtA)
  expect(thoughtA).toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
})
