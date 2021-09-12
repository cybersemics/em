import * as selection from '../selection'

it('split at selection with nested nodes', () => {
  const thoughtValue = 'The <b>rise <i>and fall</i></b> of Nikola Tesla.'
  const dummyDiv = document.createElement('div')

  dummyDiv.innerHTML = thoughtValue

  // adding dummy div to the body to allow selection to work.
  document.body.appendChild(dummyDiv)

  // The rise and| fall of Nikola Tesla. (Cursor should be after `and`)
  selection.set(dummyDiv, { offset: 12 })

  const splitResult = selection.split(dummyDiv)

  expect(splitResult).toMatchObject({
    left: 'The <b>rise <i>and</i></b>',
    right: '<b><i> fall</i></b> of Nikola Tesla.',
  })
})
