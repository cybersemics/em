import { getThoughtsRanked } from '../../util.js'

it('edit subthought', async () => {
  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()
  await document.wrapper.update()
  const thought = document.wrapper.find('div.editable')
  expect(thought.text()).toBe('')

  // edit thought
  await thought.simulate('change', { target: { value: 'c' } })

  // create subthought
  await keyboardResponder.simulate('keydown', { key: 'Enter', ctrlKey: true })
  jest.runAllTimers()
  await thought.update()
  expect(getThoughtsRanked(['c'])[0].value).toBe('')

  // find subthought
  await document.wrapper.update()
  const subthought = document.wrapper.find(
    'ul.distance-from-cursor-0 div.editable',
  )

  // edit subthought
  await subthought.simulate('change', { target: { value: 's' } })
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()
  await subthought.update()
  expect(getThoughtsRanked(['c'])[0].value).toBe('s')
})
