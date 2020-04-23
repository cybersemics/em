import { ROOT_TOKEN } from '../../constants'

import {
  getThoughtsRanked,
} from '../../util'

it('create thought above (root)', async () => {

  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()

  const editable = document.wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'a' } })

  // create thought above
  await keyboardResponder.simulate('keydown', { key: 'Enter', shiftKey: true })
  jest.runAllTimers()

  // state
  const subthoughts = getThoughtsRanked([ROOT_TOKEN])
  expect(subthoughts).toHaveLength(2)
  expect(subthoughts[0]).toMatchObject({ value: '', rank: -1 })
  expect(subthoughts[1]).toMatchObject({ value: 'a', rank: 0 })

})
