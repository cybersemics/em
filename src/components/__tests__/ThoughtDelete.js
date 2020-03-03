import { ROOT_TOKEN } from '../../constants.js'

import {
  getThoughts,
} from '../../util.js'

it('delete non-empty thought', async () => {

  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()

  // edit thought
  const editable = document.wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'a' } })

  // delete thought
  await editable.simulate('keydown', { key: 'Backspace', shiftKey: true, metaKey: true })
  jest.runAllTimers()

  // state
  const subthoughts = getThoughts([ROOT_TOKEN])
  expect(subthoughts).toHaveLength(0)

  // DOM
  const emptythoughts = document.wrapper.find('.children .children')
  expect(emptythoughts.length).toBe(0)

})
