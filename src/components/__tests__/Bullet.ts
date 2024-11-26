import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleHiddenThoughtsActionCreator as toggleHiddenThoughts } from '../../actions/toggleHiddenThoughts'
import { HOME_TOKEN } from '../../constants'
import { exportContext } from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import findCursor from '../../test-helpers/queries/findCursor'
import getBulletByContext from '../../test-helpers/queries/getBulletByContext'
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

    await act(vi.runOnlyPendingTimersAsync)

    const bullets = document.querySelectorAll('[aria-label="bullet"]')
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

    await act(vi.runOnlyPendingTimersAsync)

    // =bullet is hidden so only a is shown
    // a should not have a bullet
    const bullets = document.querySelectorAll('[aria-label="bullet"]')
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

    await act(vi.runOnlyPendingTimersAsync)

    // =bullet is hidden so only a, b, c are shown
    // only a should have a bullet
    const bullets = document.querySelectorAll('[aria-label="bullet"]')
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

    await act(vi.runOnlyPendingTimersAsync)

    // =children should not have a bullet since =bullet/None is applied
    const bullets = document.querySelectorAll('[aria-label="bullet"]')
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

    await act(vi.runOnlyPendingTimersAsync)

    // only a and b should have bullets
    const bullets = document.querySelectorAll('[aria-label="bullet"]')
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

    await act(vi.runOnlyPendingTimersAsync)

    const bullets = document.querySelectorAll('[aria-label="bullet"]')
    expect(bullets.length).toBe(4)
  })

  it('renders a parent bullet on the parent of a visible meta attribute', async () => {
    await dispatch([
      importText({
        text: `
        - A
          - =test
      `,
      }),
      toggleHiddenThoughts(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const bullets = document.querySelectorAll('[data-bullet="parent"]')
    expect(bullets.length).toBe(1)
  })
})

describe('expansion', () => {
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

    await act(vi.runOnlyPendingTimersAsync)

    const bulletOfThoughtB = getBulletByContext(['a', 'b'])

    const user = userEvent.setup({ delay: null })
    await user.click(bulletOfThoughtB)

    await act(vi.runOnlyPendingTimersAsync)

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

    await act(vi.runOnlyPendingTimersAsync)

    const bulletOfThoughtA = getBulletByContext(['x', 'a'])

    const user = userEvent.setup({ delay: null })
    await user.click(bulletOfThoughtA)

    await act(vi.runOnlyPendingTimersAsync)

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

    await act(vi.runOnlyPendingTimersAsync)

    const bulletOfThoughtA = getBulletByContext(['a'])

    const user = userEvent.setup({ delay: null })
    await user.click(bulletOfThoughtA)

    await act(vi.runOnlyPendingTimersAsync)

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

    await act(vi.runOnlyPendingTimersAsync)

    const bulletOfThoughtB = getBulletByContext(['a', 'b'])

    const user = userEvent.setup({ delay: null })
    await user.click(bulletOfThoughtB)

    await act(vi.runOnlyPendingTimersAsync)

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

    await act(vi.runOnlyPendingTimersAsync)

    const bulletOfThoughtB = getBulletByContext(['a', 'b'])

    const user = userEvent.setup({ delay: null })
    await user.click(bulletOfThoughtB)

    await act(vi.runOnlyPendingTimersAsync)

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

    const bulletOfThoughtB = getBulletByContext(['a', 'b'])

    const user = userEvent.setup({ delay: null })
    await user.click(bulletOfThoughtB)

    await act(() => vi.runAllTimersAsync())

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

    const bulletOfThoughtB = getBulletByContext(['a', 'b'])

    const user = userEvent.setup({ delay: null })
    await user.click(bulletOfThoughtB)

    await act(() => vi.runAllTimersAsync())

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
