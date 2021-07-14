import userEvent from '@testing-library/user-event'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import paste from '../../test-helpers/paste'
import { findThoughtByText } from '../../test-helpers/queries'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('define =focus/Zoom in a =let expression and apply it to a thought', async () => {
  paste(`
    - =let
      - =foo
        - =focus
          - Zoom
    - a
      - =foo
    - b
  `)

  // isElementHiddenByAutoFocus does not work since getComputedStyle is not working here for some reason
  // instead check the zoomCursor class

  // b should initially be visible
  const thoughtB = (await findThoughtByText('b')) as HTMLElement
  const subthoughts = thoughtB.closest('.children')
  expect(subthoughts).not.toHaveClass('zoomCursor')

  // Set the cursor on `a`, wait for the animation to complete, then `a` should have the zoomCursor
  // TODO: Find a way to detect if b is actually hidden
  const thoughtA = (await findThoughtByText('a')) as HTMLElement
  userEvent.click(thoughtA)
  expect(subthoughts).toHaveClass('zoomCursor')
})

it('=focus/Zoom/=style', async () => {
  paste(`
    - =let
      - =foo
        - =focus
          - Zoom
            - =style
              - color
                - pink
    - apple
      - =foo
    - bear
  `)

  const thoughtA = (await findThoughtByText('apple')) as HTMLElement
  expect(thoughtA).not.toHaveStyle({ color: 'pink' })

  userEvent.click(thoughtA)
  expect(thoughtA).toHaveStyle({ color: 'pink' })
})
