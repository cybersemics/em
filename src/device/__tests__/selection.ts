import getTextContentFromHTML from '../../device/getTextContentFromHTML'
import { anchorOffsetThought, html, offsetFromClosestParent, offsetThought } from '../selection'

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

describe('selection offsets', () => {
  it('resolves backward selection anchor and focus offsets through nested formatting', () => {
    const editable = createDummyDiv('one <b>two</b> three')
    editable.setAttribute('aria-label', 'note-editable')
    document.body.appendChild(editable)

    const trailingText = editable.childNodes[2]
    const currentSelection = window.getSelection()!
    currentSelection.removeAllRanges()
    currentSelection.collapse(trailingText, trailingText.textContent!.length)
    currentSelection.extend(trailingText, 0)

    expect(anchorOffsetThought()).toBe(13)
    expect(offsetThought()).toBe(7)

    editable.remove()
  })
})

describe('html', () => {
  // When the caret is collapsed on the editable element itself (e.g. when the cursor is moved to a thought by
  // tapping its bullet), html() must return the editable's contents, not its outer wrapper element with attributes
  // such as placeholder="<b>One</b>" (#3912).
  it('returns the editable inner html rather than the wrapper element for a collapsed caret on the editable', () => {
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    editable.setAttribute('data-editable', 'true')
    editable.setAttribute('placeholder', '<b>One</b>')
    editable.innerHTML = '<b>One</b>'
    document.body.appendChild(editable)

    const range = document.createRange()
    range.setStart(editable, 0)
    range.collapse(true)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)

    expect(html()).toBe('<b></b>')

    document.body.removeChild(editable)
  })
})
