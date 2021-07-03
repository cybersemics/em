import { getCaretPositionDetails } from '../getCaretPositionDetails'
import { getTextContentFromHTML } from '../getTextContentFromHTML'

/** Create dummy div with given html value. */
const createDummyDiv = (htmlValue: string) => {
  const dummyDiv = document.createElement('div')
  dummyDiv.innerHTML = htmlValue
  return dummyDiv
}

it('get caret position details at the beginning of the thought', () => {
  const thoughtValue = 'tanjiro <b> sword </b>'
  const dummyEditable = createDummyDiv(thoughtValue)

  const caretPositionDetails = getCaretPositionDetails(dummyEditable, 0)
  expect(caretPositionDetails).toMatchObject({
    focusNode: dummyEditable,
    offset: 0,
  })
})

it('get caret position details at the end of the thought', () => {
  const thoughtValue = 'Itadori <b>Jujutsu</b>'

  const dummyEditable = createDummyDiv(thoughtValue)

  const textContent = getTextContentFromHTML(thoughtValue)

  const caretPositionDetails = getCaretPositionDetails(dummyEditable, textContent.length)
  expect(caretPositionDetails).toMatchObject({
    focusNode: dummyEditable,
    offset: 2,
  })
})

it('get caret position details at relative offset of the thought', () => {
  const thoughtValue = 'This is a <b> nested <i>html</i> value.</b>'

  const dummyEditable = createDummyDiv(thoughtValue)

  // Note: Taking offset relative to the plain text that doesn't includes any html tags. i.e `This is a nested html value.`

  const caretPositionDetailsFirst = getCaretPositionDetails(dummyEditable, 20)

  /*
   * Dom structure inside editable.
   *
   * - Editable root
   *  - [0] Text ('This is a ')
   *  - [1] Bold
   *    - [0] Text ('nested ')
   *    - [1] Italic
   *      - [0]Text ('htm|l') Expecting caret postion to be at third index of this text node.
   *    - [1] Text (' value.').
   */

  expect(caretPositionDetailsFirst).toMatchObject({
    focusNode: dummyEditable.getElementsByTagName('i')[0].childNodes[0],
    offset: 2,
  })

  const caretPositionDetailsSecond = getCaretPositionDetails(dummyEditable, 26)

  /*
   * Dom structure inside editable.
   *
   * - Editable root
   *  - [0] Text ('This is a ')
   *  - [1] Bold
   *    - [0] Text ('nested ')
   *    - [1] Italic
   *      - [0]Text ('html')
   *    - [2] Text ( 'valu|e.') Expecting caret postion to be at fourth index of this text node.
   */

  expect(caretPositionDetailsSecond).toMatchObject({
    focusNode: dummyEditable.getElementsByTagName('b')[0].childNodes[2],
    offset: 4,
  })
})
