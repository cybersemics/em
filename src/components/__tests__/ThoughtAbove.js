import { ROOT_TOKEN } from '../../constants.js'
import { getThoughts } from '../../util.js'

it('create thought above', async () => {
  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()
  await document.wrapper.update()
  const thought = document.wrapper.find('div.editable')
  expect(thought.text()).toBe('')

  // create subthought
  await keyboardResponder.simulate('keydown', { key: 'Enter', shiftKey: true })
  const children = getThoughts([ROOT_TOKEN])
  expect(children).toHaveLength(2)
})
