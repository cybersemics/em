import { store } from '../../store'
import { ROOT_TOKEN } from '../../constants'
import { createTestApp, windowEvent } from '../../setupTests'

// selectors
import getThoughts from '../../selectors/getThoughts'

beforeEach(async () => {
  createTestApp()
})

it('delete empty thought', async () => {

  // create thought
  windowEvent('keydown', { key: 'Enter' })
  jest.runAllTimers()

  // delete thought
  windowEvent('keydown', { key: 'Backspace' })
  jest.runAllTimers()

  // state
  const subthoughts = getThoughts(store.getState(), [ROOT_TOKEN])
  expect(subthoughts).toHaveLength(0)

  // DOM
  document.wrapper.update()
  const emptythoughts = document.wrapper.find('.children .children')
  expect(emptythoughts.length).toBe(0)

})
