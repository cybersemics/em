import { store } from '../../store'
import { ROOT_TOKEN } from '../../constants'
import { createTestApp, windowEvent } from '../../setupTests'

// selectors
import {
  getThoughts,
} from '../../selectors'

beforeEach(async () => {
  createTestApp()
})

it('archive non-empty thought', async () => {

  // create thought
  windowEvent('keydown', { key: 'Enter' })
  document.wrapper.update()

  // edit thought
  const editable = document.wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'a' } })
  jest.runAllTimers()

  // archive thought
  windowEvent('keydown', { key: 'Backspace', shiftKey: true, metaKey: true })
  document.wrapper.update()

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
