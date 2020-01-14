import { act } from 'react-dom/test-utils'
import { getThoughtsRanked } from '../../util.js'

it('delete subthought', async () => {
  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()
  await document.wrapper.update()
  const thought = document.wrapper.find('div.editable')
  expect(thought.text()).toBe('')

  // edit thought
  await thought.simulate('change', { target: { value: 'c' } })
  await keyboardResponder.simulate('keydown', { key: 'Enter', ctrlKey: true })
  jest.runAllTimers()
  await thought.update()
  expect(getThoughtsRanked(['c'])[0].value).toBe('')
  await document.wrapper.update()

  // test subthought
  const subthought = document.wrapper.find(
    'ul.distance-from-cursor-0 div.editable',
  )
  jest.runAllTimers()
  await subthought.update()
  expect(subthought.text()).toBe('')
  expect(getThoughtsRanked(['c'])[0].value).toBe('')
  await act(async () => {
    await subthought.simulate('keydown', { key: 'Backspace' })
  })
  expect(getThoughtsRanked(['c']).length).toBe(0)
})
