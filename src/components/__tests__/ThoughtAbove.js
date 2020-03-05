import {
  getThoughtsRanked,
} from '../../util.js'

it('create thought above', async () => {

  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()
  const editable = document.wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'z' } })

  // create subthought
  await keyboardResponder.simulate('keydown', { key: 'Enter', ctrlKey: true })
  jest.runAllTimers()

  const editable2 = document.wrapper.find('.children .children div.editable')
  await editable2.simulate('change', { target: { value: 'a' } })

  // create thought above
  await keyboardResponder.simulate('keydown', { key: 'Enter', shiftKey: true })
  jest.runAllTimers()

  // state
  const subthoughts = getThoughtsRanked(['z'])
  expect(subthoughts).toHaveLength(2)
  expect(subthoughts[0]).toMatchObject({ value: '', rank: -1 })
  expect(subthoughts[1]).toMatchObject({ value: 'a', rank: 0 })

})
