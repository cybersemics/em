import { getThoughtsRanked } from '../../util.js'

it('create subthought', async () => {

  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()
  const editable = document.wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'a' } })

  // create subthought
  await keyboardResponder.simulate('keydown', { key: 'Enter', ctrlKey: true })
  jest.runAllTimers()
  const editableSubthought = document.wrapper.find('.children .children div.editable')
  await editableSubthought.simulate('change', { target: { value: 'b' } })

  // state
  const subthoughts = getThoughtsRanked(['a'])
  expect(subthoughts).toHaveLength(1)
  expect(subthoughts[0]).toMatchObject({ value: 'b', rank: 0 })

})
