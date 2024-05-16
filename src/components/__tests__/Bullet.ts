import { findAllByLabelText, screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleHiddenThoughtsActionCreator as toggleHiddenThoughts } from '../../actions/toggleHiddenThoughts'
import { HOME_TOKEN } from '../../constants'
import { exportContext } from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import dispatch from '../../test-helpers/dispatch'
import { findCursor } from '../../test-helpers/queries/findCursor'
import { findSubthoughts } from '../../test-helpers/queries/findSubthoughts'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

describe('render', () => {
  it('render a bullet next to each thought', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - b
            - c
      `,
      }),
    ])

    const bullets = document.querySelectorAll('.bullet')
    expect(bullets.length).toBe(3)
  })

  it('do not render a bullet with =bullet/None', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =bullet
            - None
      `,
      }),
    ])

    // =bullet is hidden so only a is shown
    // a should not have a bullet
    const bullets = document.querySelectorAll('.bullet')
    expect(bullets.length).toBe(0)
  })

  it('do not render bullets on a child of a thought with =children/=bullet/None', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =children
            - =bullet
              - None
          - b
          - c
      `,
      }),
    ])

    // =bullet is hidden so only a, b, c are shown
    // only a should have a bullet
    const bullets = document.querySelectorAll('.bullet')
    expect(bullets.length).toBe(1)
  })

  // this is in contrast to how =children/=style works
  // it seems visually disruptive to have inconsistent bullets within a context
  it('do not render bullet of =children itself since it is one of the children', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =children
            - =bullet
              - None
      `,
      }),
      toggleHiddenThoughts(),
    ])

    // =children should not have a bullet since =bullet/None is applied
    const bullets = document.querySelectorAll('.bullet')
    expect(bullets.length).toBe(3)
  })

  it('do not render bullets on a grandchild of a thought with =grandchildren/=bullet/None', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =grandchildren
            - =bullet
              - None
          - b
            - c
            - d
            - e
            - f
      `,
      }),
    ])

    // only a and b should have bullets
    const bullets = document.querySelectorAll('.bullet')
    expect(bullets.length).toBe(2)
  })

  // in contrast to =children/=bullet, =grandchildren/=bullet does not naturally apply to =grandchildren, so we need to prevent the normal behavior of =bullet being applied to its parent
  it('render bullet of =grandchildren itself', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =grandchildren
            - =bullet
              - None
      `,
      }),
      toggleHiddenThoughts(),
    ])

    const bullets = document.querySelectorAll('.bullet')
    expect(bullets.length).toBe(4)
  })
})

// TODO: findSubthoughts is broken after LayoutTree
describe.skip('expansion', () => {
  it('tapping an expanded cursor bullet should collapse the thought by moving the cursor up', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - b
            - c
          - d
      `,
      }),
      setCursor(['a', 'b']),
    ])

    const subthoughts = await findSubthoughts('a')
    const bulletsOfSubthoughtsA = await findAllByLabelText(subthoughts[0], 'bullet')
    userEvent.click(bulletsOfSubthoughtsA[0])

    const thoughtCursor = await findCursor()
    expect(thoughtCursor).toHaveTextContent('a')
  })

  it('tapping the cursor bullet on an ancestor should collapse all descendants', async () => {
    await dispatch([
      importText({
        text: `
        - x
          - a
            - b
              - c
          - d
      `,
      }),
      setCursor(['x', 'a', 'b', 'c']),
    ])

    const subthoughts = await findSubthoughts('x')
    const bulletsOfSubthoughtsX = await findAllByLabelText(subthoughts[0], 'bullet')
    userEvent.click(bulletsOfSubthoughtsX[0])

    const thoughtCursor = await findCursor()
    expect(thoughtCursor).toHaveTextContent('x')
  })

  it('tapping an expanded root thought bullet should set the cursor to null', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - b
            - c
          - d
      `,
      }),
      setCursor(['a', 'b', 'c']),
    ])

    const bullets = await screen.findAllByLabelText('bullet')
    userEvent.click(bullets[0])

    const thoughtCursor = await findCursor()
    expect(thoughtCursor).toBeNull()
  })

  it('tapping on a collapsed non-cursor bullet should move the cursor to that thought', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - b
            - c
          - d
      `,
      }),
    ])

    const subthoughts = await findSubthoughts('a')
    const bulletB = await findAllByLabelText(subthoughts[0], 'bullet')
    userEvent.click(bulletB[0])

    const thoughtCursor = await findCursor()
    expect(thoughtCursor).toHaveTextContent('b')
  })

  it('tapping on a pinned thought should unpin it', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - b
            - =pin
              - true
            - c
          - d
            - e
      `,
      }),
    ])

    const subthoughts = await findSubthoughts('a')
    const bulletB = await findAllByLabelText(subthoughts[0], 'bullet')
    userEvent.click(bulletB[0])

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toEqual(`- __ROOT__
  - a
    - b
      - c
    - d
      - e`)
  })

  it('tapping on an expanded only child should unpin it', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - b
            - c
      `,
      }),
    ])

    const subthoughts = await findSubthoughts('a')
    const bulletB = await findAllByLabelText(subthoughts[0], 'bullet')
    userEvent.click(bulletB[0])

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toEqual(`- __ROOT__
  - a
    - b
      - =pin
        - false
      - c`)
  })

  it('tapping on a thought expanded by =children should unpin it', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =children
            - =pin
              - true
          - b
            - c
          - d
            - e
      `,
      }),
    ])

    const subthoughts = await findSubthoughts('a')
    const bulletB = await findAllByLabelText(subthoughts[0], 'bullet')
    userEvent.click(bulletB[0])

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toEqual(`- __ROOT__
  - a
    - =children
      - =pin
        - true
    - b
      - =pin
        - false
      - c
    - d
      - e`)
  })
})
