// import { getThoughtsRanked } from '../../util.js'
import { ROOT_TOKEN } from '../../constants.js'
import { getThoughts, getThoughtsRanked } from '../../util.js'

it('create subthought', async () => {
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
  await thought.update()
  jest.runAllTimers()

  // test subthought
  const children = getThoughts([ROOT_TOKEN])
  expect(children).toHaveLength(1)
  expect(children[0]).toMatchObject({ value: 'c', rank: 0 })
  expect(getThoughtsRanked(['c'])[0].value).toBe('')
})
