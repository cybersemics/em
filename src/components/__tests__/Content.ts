import { ReactWrapper } from 'enzyme'
import { store } from '../../store'
import deleteThoughtWithCursor from '../../action-creators/deleteThoughtWithCursor'
import importText from '../../action-creators/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import NewThoughtInstructions from '../NewThoughtInstructions'
import contextToPath from '../../selectors/contextToPath'

let wrapper: ReactWrapper<unknown, unknown> // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(cleanupTestApp)

it('show NewThoughtInstructions when there are no visible thoughts in the root context', () => {
  // NewThoughtInstructions should be visible when there are no thoughts
  expect(wrapper.find(NewThoughtInstructions)).toHaveLength(1)

  store.dispatch(
    importText({
      text: `
      - a
      - b
      - =test
    `,
    }),
  )

  wrapper.update()

  // NewThoughtInstructions should not be visible when there is at least one visible thought
  expect(wrapper.find(NewThoughtInstructions)).toHaveLength(0)

  store.dispatch(
    deleteThoughtWithCursor({
      path: contextToPath(store.getState(), ['b'])!,
    }),
  )

  // still has one visible thought
  expect(wrapper.find(NewThoughtInstructions)).toHaveLength(0)

  store.dispatch(
    deleteThoughtWithCursor({
      path: contextToPath(store.getState(), ['b'])!,
    }),
  )

  wrapper.update()

  // There are no visible thoughts
  expect(wrapper.find(NewThoughtInstructions)).toHaveLength(1)
})
