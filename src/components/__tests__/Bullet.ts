import importText from '../../action-creators/importText'
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

  const bullets = document.querySelectorAll('.bullet')
  expect(bullets.length).toBe(0)
})

it('do not render children bullets on a thought with =children/=bullet/None', () => {
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

  const bullets = document.querySelectorAll('.bullet')
  expect(bullets.length).toBe(1)
})

it('do not render children bullets on a thought with =grandchildren/=bullet/None', () => {
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

  const bullets = document.querySelectorAll('.bullet')
  expect(bullets.length).toBe(2)
})
