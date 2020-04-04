import { getThoughts } from '../../util'
import { ROOT_TOKEN } from '../../constants'

it('create thought', async () => {

  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()

  // state
  const subthoughts = getThoughts([ROOT_TOKEN])
  expect(subthoughts).toHaveLength(1)
  expect(subthoughts[0]).toMatchObject({ value: '', rank: 0 })

  // DOM
  const editable = document.wrapper.find('div.editable')
  expect(editable.text()).toBe('')

})
