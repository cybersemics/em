import { ReactWrapper } from 'enzyme'
import { store } from '../../store'
import { deleteThought, importText } from '../../action-creators'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import NewThoughtInstructions from '../NewThoughtInstructions'
import { HOME_PATH } from '../../constants'

let wrapper: ReactWrapper<unknown, unknown> // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(cleanupTestApp)

it('show NewThoughtInstructions when there are no visible thoughts in the root context', () => {

  // NewThoughtInstructions should be visible when there are no thoughts
  expect(wrapper.find(NewThoughtInstructions)).toHaveLength(1)

  store.dispatch(importText({
    path: HOME_PATH,
    text: `
      - a
      - b
      - =test
    `
  }))

  wrapper.update()

  // NewThoughtInstructions should not be visible when there is at least one visible thought
  expect(wrapper.find(NewThoughtInstructions)).toHaveLength(0)

  store.dispatch(deleteThought({
    path: [{ value: 'a', rank: 0 }]
  }))

  // still has one visible thought
  expect(wrapper.find(NewThoughtInstructions)).toHaveLength(0)

  store.dispatch(deleteThought({
    path: [{ value: 'b', rank: 1 }]
  }))

  wrapper.update()

  // There are no visible thoughts
  expect(wrapper.find(NewThoughtInstructions)).toHaveLength(1)

})
