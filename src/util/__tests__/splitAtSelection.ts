import { getCaretPositionDetails } from '../getCaretPositionDetails'
import { setSelection } from '../setSelection'
import { splitAtSelection } from '../splitAtSelection'

it('split at selecion with nested nodes', () => {
  const thoughtValue = 'The <b>rise <i>and fall</i></b> of Nikola Tesla.'
  const dummyDiv = document.createElement('div')

  dummyDiv.innerHTML = thoughtValue

  // adding dummy div to the body to allow selection to work.
  document.body.appendChild(dummyDiv)

  // The rise and| fall of Nikola Tesla. (Cursor should be after `and`)
  // Note: getting required focus node and offset using relative offset
  const caretPositionDetails = getCaretPositionDetails(dummyDiv, 12)

  setSelection(caretPositionDetails?.focusNode || dummyDiv, {
    offset: caretPositionDetails?.offset,
  })

  const selectionRange = document.getSelection()?.getRangeAt(0)

  const splitResult = splitAtSelection(dummyDiv, selectionRange!)

  expect(splitResult).toMatchObject({
    left: 'The <b>rise <i>and</i></b>',
    right: '<b><i> fall</i></b> of Nikola Tesla.',
  })
})
