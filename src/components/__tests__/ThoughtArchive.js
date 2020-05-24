import { store } from '../../store'
import { ROOT_TOKEN } from '../../constants'
import { createTestApp } from '../../setupTests'

// selectors
import {
  getThoughts,
} from '../../selectors'

beforeEach(async () => {
  createTestApp()
})

it('archive non-empty thought', async () => {

  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()

  // edit thought
  const editable = document.wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'a' } })
  jest.runAllTimers()

  // archive thought
  await editable.simulate('keydown', { key: 'Backspace', shiftKey: true, metaKey: true })
  jest.runAllTimers()

  // state
  const subthoughts = getThoughts(store.getState(), [ROOT_TOKEN])
  expect(subthoughts).toHaveLength(1)
  expect(subthoughts[0]).toMatchObject({ value: '=archive', rank: -1 })

  const archiveSubthoughts = getThoughts(store.getState(), ['=archive'])
  expect(archiveSubthoughts).toHaveLength(1)
  expect(archiveSubthoughts[0]).toMatchObject({ value: 'a', rank: 0 })

  // DOM
  const emptythoughts = document.wrapper.find('.children .children')
  expect(emptythoughts.length).toBe(0)

})
