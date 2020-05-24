import { store } from '../../store'
import { getThoughtsRanked } from '../../selectors'
import { createTestApp, windowEvent } from '../../setupTests'

beforeEach(async () => {
  createTestApp()
})

it('create subthought', async () => {

  // create thought
  windowEvent('keydown', { key: 'Enter' })
  document.wrapper.update()

  const editable = document.wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'a' } })

  // create subthought
  windowEvent('keydown', { key: 'Enter', ctrlKey: true })
  document.wrapper.update()

  // edit subthought
  const editableSubthought = document.wrapper.find('.children .children div.editable')
  await editableSubthought.simulate('change', { target: { value: 'b' } })
  jest.runAllTimers()

  // state
  const subthoughts = getThoughtsRanked(store.getState(), ['a'])
  expect(subthoughts).toHaveLength(1)
  expect(subthoughts[0]).toMatchObject({ value: 'b', rank: 0 })

})
