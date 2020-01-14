it('create thought', async () => {
  const keyboardResponder = document.wrapper.find('#keyboard')
  await keyboardResponder.simulate('keydown', { key: 'Enter' })
  jest.runAllTimers()
  await document.wrapper.update()
  const thought = document.wrapper.find('div.editable')
  expect(thought.text()).toBe('')
})
