import { createTestApp, windowEvent } from '../../setupTests'
import { store } from '../../store'

// selectors
import getThoughtsRanked from '../../selectors/getThoughtsRanked'

beforeEach(async () => {
  createTestApp()
})

it('create thought above', async () => {

  // create thought
  windowEvent('keydown', { key: 'Enter' })

  document.wrapper.update()
  const editable = document.wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'z' } })

  // create subthought
  windowEvent('keydown', { key: 'Enter', ctrlKey: true })
  document.wrapper.update()
  const editable2 = document.wrapper.find('.children .children div.editable')
  await editable2.simulate('change', { target: { value: 'a' } })

  // create thought above
  windowEvent('keydown', { key: 'Enter', shiftKey: true })
  jest.runAllTimers()

  // state
  const subthoughts = getThoughtsRanked(store.getState(), ['z'])
  expect(subthoughts).toHaveLength(2)
  expect(subthoughts[0]).toMatchObject({ value: '', rank: -1 })
  expect(subthoughts[1]).toMatchObject({ value: 'a', rank: 0 })

})
