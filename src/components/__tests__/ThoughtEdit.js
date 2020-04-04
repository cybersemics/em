import { ROOT_TOKEN } from '../../constants'
import { getThoughts } from '../../util'

it('edit thought', async () => {

  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()

  // edit thought
  const editable = document.wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'a' } })

  // state
  const subthoughts = getThoughts([ROOT_TOKEN])
  expect(subthoughts).toHaveLength(1)
  expect(subthoughts[0]).toMatchObject({ value: 'a', rank: 0 })

  // DOM
  // TODO: Why doesn't this work?
  // document.wrapper.update()
  // const editable2 = document.wrapper.find('div.editable')
  // expect(editable2.text()).toBe('a')

})
