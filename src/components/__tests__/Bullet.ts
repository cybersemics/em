import importText from '../../action-creators/importText'
import toggleHiddenThoughts from '../../action-creators/toggleHiddenThoughts'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('render a bullet next to each thought', () => {
  store.dispatch([
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

it('do not render a bullet with =bullet/None', () => {
  store.dispatch([
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

it('do not render bullets on a child of a thought with =children/=bullet/None', () => {
  store.dispatch([
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
it('do not render bullet of =children itself since it is one of the children', () => {
  store.dispatch([
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

it('do not render bullets on a grandchild of a thought with =grandchildren/=bullet/None', () => {
  store.dispatch([
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
it('render bullet of =grandchildren itself', () => {
  store.dispatch([
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
