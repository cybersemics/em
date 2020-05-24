import { store } from '../../store'
import { getThoughts } from '../../selectors'
import { ROOT_TOKEN } from '../../constants'
import { createTestApp, windowEvent } from '../../setupTests'

beforeEach(async () => {
  createTestApp()
})

it('create thought', async () => {

  // create thought
  windowEvent('keydown', { key: 'Enter' })
  jest.runAllTimers()

  // state
  const subthoughts = getThoughts(store.getState(), [ROOT_TOKEN])
  expect(subthoughts).toHaveLength(1)
  expect(subthoughts[0]).toMatchObject({ value: '', rank: 0 })

  // DOM
  document.wrapper.update()
  const editable = document.wrapper.find('div.editable')
  expect(editable.text()).toBe('')

})
