import splitAtSelection from '../splitAtSelection'
import { setSelection } from '../../util/setSelection'

it('split at selection with nested nodes', () => {
  const thoughtValue = 'The <b>rise <i>and fall</i></b> of Nikola Tesla.'
  const dummyDiv = document.createElement('div')

  dummyDiv.innerHTML = thoughtValue

  // adding dummy div to the body to allow selection to work.
  document.body.appendChild(dummyDiv)

  // The rise and| fall of Nikola Tesla. (Cursor should be after `and`)
  setSelection(dummyDiv, { offset: 12 })

  const selectionRange = document.getSelection()?.getRangeAt(0)

  const splitResult = splitAtSelection(dummyDiv, selectionRange!)

  expect(splitResult).toMatchObject({
    left: 'The <b>rise <i>and</i></b>',
    right: '<b><i> fall</i></b> of Nikola Tesla.',
  })
})
