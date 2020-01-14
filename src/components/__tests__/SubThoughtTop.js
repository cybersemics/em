import { getThoughtsRanked } from '../../util.js'

it('create top subthought', async () => {
  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()
  await document.wrapper.update()
  const thought = document.wrapper.find('div.editable')
  expect(thought.text()).toBe('')

  // create subthought
  await thought.simulate('change', { target: { value: 'c' } })
  await keyboardResponder.simulate('keydown', { key: 'Enter', ctrlKey: true })
  jest.runAllTimers()
  await thought.update()
  expect(getThoughtsRanked(['c'])[0].value).toBe('')

  // edit subthought
  await document.wrapper.update()
  const subthought = document.wrapper.find(
    'ul.distance-from-cursor-0 div.editable',
  )
  await subthought.simulate('change', { target: { value: 's' } })
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()
  await subthought.update()
  expect(getThoughtsRanked(['c'])[0].value).toBe('s')

  // create top subthought
  await keyboardResponder.simulate('keydown', { key: 'Enter', shifKey: true, metaKey: true })
  const subthoughttop = document.wrapper.find(
    'ul.distance-from-cursor-0 div.editable',
  )
  await document.wrapper.update()
  jest.runAllTimers()
  await subthoughttop.update()
  expect(subthoughttop.length).toBe(1)
})
