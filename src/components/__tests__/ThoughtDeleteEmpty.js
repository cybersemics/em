import { act } from 'react-dom/test-utils'

it('delete empty thought', async () => {
  // create thought
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()
  await document.wrapper.update()
  const thought = document.wrapper.find('div.editable')
  expect(thought.text()).toBe('')

  // edit thought
  await thought.simulate('change', { target: { value: 'c' } })
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()
  await thought.update()

  // delete thought
  await keyboardResponder.simulate('keydown', { key: 'Backspace' })
  await thought.simulate('change', { target: { value: '' } })
  await act(async () => {
    await thought.simulate('keydown', { key: 'Backspace' })
  })
  jest.runAllTimers()
  await document.wrapper.update()
  const emptythoughts = document.wrapper.find('div.transformContain div ul.children')
  expect(emptythoughts.length).toBe(0)
})
