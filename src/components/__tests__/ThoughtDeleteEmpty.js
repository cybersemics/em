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

  // delete thought
  windowEvent('keydown', { key: 'Backspace' })

  // state
  const subthoughts = getThoughts(store.getState(), [ROOT_TOKEN])
  expect(subthoughts).toHaveLength(0)

  // DOM
  const emptythoughts = document.wrapper.find('.children .children')
  expect(emptythoughts.length).toBe(0)

})
