import { screen, waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleHiddenThoughtsActionCreator as toggleHiddenThoughts } from '../../actions/toggleHiddenThoughts'
import { HOME_TOKEN } from '../../constants'
import { exportContext } from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import dispatch from '../../test-helpers/dispatch'
import { findCursor } from '../../test-helpers/queries/findCursor'
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

    const initialState = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    // Find all bullet elements:
    const bulletElements = await screen.findAllByLabelText('bullet')

    // Click the second bullet directly:
    await userEvent.click(bulletElements[1]) // Index 1 for the second bullet

    // Wait for the state to update:
    await waitFor(() => {
      const newState = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      // There should be only 3 thoughts in the DOM
      const thoughtElements = document.querySelectorAll('.thought-container .thought')
      const thoughtElementsArray = Array.from(thoughtElements)
      expect(thoughtElementsArray.length).toBe(3)

      // Expect that the state is still valid
      expect(newState).toEqual(initialState)
    })
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

    // Wait for the state to update and all bullet elements to render
    await waitFor(async () => {
      const bulletElements = await screen.findAllByLabelText('bullet')
      expect(bulletElements).toHaveLength(3)
    })

    // Grab the bullets & click the second bullet directly:
    const firstClickElements = await screen.findAllByLabelText('bullet')
    await userEvent.click(firstClickElements[1]) // b

    // Wait for the state to update and all bullet elements to render
    await waitFor(async () => {
      const bulletElements = await screen.findAllByLabelText('bullet')

      // After the first click there should be 4 elements
      expect(bulletElements).toHaveLength(4)
    })

    // Grab the bullets & click the second bullet directly:
    const secondClickElements = await screen.findAllByLabelText('bullet')
    await userEvent.click(secondClickElements[0]) // x

    await waitFor(async () => {
      const bulletElements = await screen.findAllByLabelText('bullet')

      // After the second click, there should be 3 elements
      expect(bulletElements).toHaveLength(3)
    })
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

    const targetThought = await screen.findByText('b', {
      selector: 'div.thought div[contenteditable="true"]',
    })

    // Find the parent element and then find the bullet sibling:
    const parentElement = targetThought.parentElement
    const parentArray = Array.from(parentElement.children)
    const bulletElement = parentArray[0] // <--- Bullet is the first child

    // Ensure the bullet element was found:
    expect(bulletElement).toBeInTheDocument()

    // Simulate the click:
    await userEvent.click(bulletElement)

    // Assertions:
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

    const initialState = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    // Find all bullet elements:
    const bulletElements = await screen.findAllByLabelText('bullet')

    // Click the second bullet directly:
    await userEvent.click(bulletElements[1]) // Index 1 for the second bullet

    // Wait for the state to update:
    await waitFor(() => {
      const newState = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      // Expect that the state has changed:
      expect(newState).not.toEqual(initialState)

      // Expect that the entire "pin" section is removed:
      expect(newState).not.toContain('- =pin\n  - true')

      // Expect that the entire payload is correct
      // Expect that the entire "pin" section set to false:
      expect(newState).toEqual(`- __ROOT__
  - a
    - b
      - c
    - d
      - e`)
    })
  })

  it('tapping on an expanded only child should unpin it', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - b
            - c
              - =pin
                - true
      `,
      }),
    ])

    const initialState = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    // Find all bullet elements:
    const bulletElements = await screen.findAllByLabelText('bullet')

    // Click the second bullet directly:
    await userEvent.click(bulletElements[2]) // Index 1 for the second bullet

    // Wait for the state to update:
    await waitFor(() => {
      const newState = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      // Expect that the state has changed:
      expect(newState).not.toEqual(initialState)

      // Expect that the entire "pin" section set to false:
      expect(newState).toEqual(`- __ROOT__
  - a
    - b
      - c
        - =pin
          - false`)
    })
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

    const initialState = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    // Find all bullet elements:
    const bulletElements = await screen.findAllByLabelText('bullet')

    // Click the second bullet directly:
    await userEvent.click(bulletElements[1]) // Index 1 for the second bullet

    // Wait for the state to update:
    await waitFor(() => {
      const newState = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      // Expect that the state has changed:
      expect(newState).not.toEqual(initialState)

      // Expect that the entire "pin" section set to false:
      expect(newState).toEqual(`- __ROOT__
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
})
