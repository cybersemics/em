import { importTextActionCreator as importText } from '../../actions/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('render EmptyThoughtspace when there are no thoughts in the root context', async () => {
  expect(document.querySelector('.empty-thoughtspace')).toBeTruthy()
})

it('do not render EmptyThoughtspace when there are thoughts in the root context', async () => {
  await dispatch(
    importText({
      text: `
      - a
      - b
      - =test
    `,
    }),
  )

  expect(document.querySelector('.empty-thoughtspace')).toBeNull()
})

it('render EmptyThoughtspace when there are only invisible thoughts in the root context', async () => {
  await dispatch(
    importText({
      text: `
      - =test
    `,
    }),
  )

  expect(document.querySelector('.empty-thoughtspace')).toBeTruthy()
})
