import { store } from '../../store'
import { ROOT_TOKEN } from '../../constants'
import { createTestApp } from '../../setupTests'

// selectors
import getThoughts from '../../selectors/getThoughts'

beforeEach(async () => {
  createTestApp()
})

it('delete empty thought', async () => {

  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()

  // delete thought
  const editable = document.wrapper.find('div.editable')
  await editable.simulate('keydown', { key: 'Backspace' })
  jest.runAllTimers()

  // state
  const subthoughts = getThoughts(store.getState(), [ROOT_TOKEN])
  expect(subthoughts).toHaveLength(0)

  // DOM
  const emptythoughts = document.wrapper.find('.children .children')
  expect(emptythoughts.length).toBe(0)

})
