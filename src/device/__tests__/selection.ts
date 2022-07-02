import getTextContentFromHTML from '../../device/getTextContentFromHTML'
import { offsetFromClosestParent } from '../selection'

/** Create dummy div with given html value. */
const createDummyDiv = (htmlValue: string) => {
  const dummyDiv = document.createElement('div')
  dummyDiv.innerHTML = htmlValue
  return dummyDiv
}

describe('offsetFromClosestParent', () => {
  it('get caret position details at the beginning of the thought', () => {
    const thoughtValue = 'tanjiro <b> sword </b>'
    const dummyEditable = createDummyDiv(thoughtValue)

    const nodeOffset = offsetFromClosestParent(dummyEditable, 0)
    expect(nodeOffset).toMatchObject({
      node: dummyEditable,
      offset: 0,
    })
  })

  it('get caret position details at the end of the thought', () => {
    const thoughtValue = 'Itadori <b>Jujutsu</b>'

    const dummyEditable = createDummyDiv(thoughtValue)

    const textContent = getTextContentFromHTML(thoughtValue)

    const nodeOffset = offsetFromClosestParent(dummyEditable, textContent.length)
    expect(nodeOffset).toMatchObject({
      node: dummyEditable,
      offset: 2,
    })
  })

  it('get caret position details at relative offset of the thought', () => {
    const thoughtValue = 'This is a <b> nested <i>html</i> value.</b>'

    const dummyEditable = createDummyDiv(thoughtValue)

    // Note: Taking offset relative to the plain text that doesn't includes any html tags. i.e `This is a nested html value.`

    const nodeOffsetFirst = offsetFromClosestParent(dummyEditable, 20)

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

    expect(nodeOffsetFirst).toMatchObject({
      node: dummyEditable.getElementsByTagName('i')[0].childNodes[0],
      offset: 2,
    })

    const nodeOffsetSecond = offsetFromClosestParent(dummyEditable, 26)

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

    expect(nodeOffsetSecond).toMatchObject({
      node: dummyEditable.getElementsByTagName('b')[0].childNodes[2],
      offset: 4,
    })
  })
})
