import { ROOT_TOKEN } from '../../constants'
import { getThoughts } from '../../selectors'
import { store } from '../../store'
import { createTestApp, windowEvent } from '../../setupTests'

beforeEach(async () => {
  createTestApp()
})

it('edit thought', async () => {

  // create thought
  windowEvent('keydown', { key: 'Enter' })
  document.wrapper.update()

  // edit thought
  const editable = document.wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'a' } })
  jest.runAllTimers()

  // state
  const subthoughts = getThoughts(store.getState(), [ROOT_TOKEN])
  expect(subthoughts).toHaveLength(1)
  expect(subthoughts[0]).toMatchObject({ value: 'a', rank: 0 })

  // DOM
  // TODO: Why doesn't this work?
  // document.wrapper.update()
  // const editable2 = document.wrapper.find('div.editable')
  // expect(editable2.text()).toBe('a')

})
