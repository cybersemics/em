import { store } from '../../store'
import { getThoughtsRanked } from '../../selectors'

it('create top subthought', async () => {

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
  await editableSubthought.simulate('change', { target: { value: 'a1' } })

  // cursor back
  await keyboardResponder.simulate('keydown', { key: 'Escape' })
  jest.runAllTimers()

  // create top subthought
  await keyboardResponder.simulate('keydown', { key: 'Enter', shiftKey: true, ctrlKey: true })
  jest.runAllTimers()

  // state
  const subthoughts = getThoughtsRanked(store.getState(), ['a'])
  expect(subthoughts).toHaveLength(2)
  expect(subthoughts[0]).toMatchObject({ value: '', rank: -1 })
  expect(subthoughts[1]).toMatchObject({ value: 'a1', rank: 0 })

  // DOM
  const editableSubthoughts2 = document.wrapper.find('.children .children div.editable')
  expect(editableSubthoughts2).toHaveLength(2)
  expect(editableSubthoughts2.at(0).text()).toBe('')
  expect(editableSubthoughts2.at(1).text()).toBe('a1')

})
