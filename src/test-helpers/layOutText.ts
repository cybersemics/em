/**
 * Lays out all text on one line, charWidth per character and lineHeight tall, for the range geometry that
 * getCaretOffset hit-tests a click or tap against. JSDOM measures every range as empty, so without this a click
 * resolves to no offset. A range is measured from its offsets within its own text node, so the text an offset is
 * measured in should be a single text node.
 *
 * Replaces Range.prototype.getBoundingClientRect and getClientRects for the rest of the test, and restores the ones
 * from setupTests when it finishes.
 */
const layOutText = ({ charWidth = 10, lineHeight = 20 }: { charWidth?: number; lineHeight?: number } = {}) => {
  /** Returns the rect of a range within a text node. */
  const rectOf = (range: Range) =>
    new DOMRect(range.startOffset * charWidth, 0, (range.endOffset - range.startOffset) * charWidth, lineHeight)

  const boundingClientRect = vi.spyOn(Range.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: Range,
  ) {
    return rectOf(this)
  })
  const clientRects = vi.spyOn(Range.prototype, 'getClientRects').mockImplementation(function (this: Range) {
    // DOMRectList is not constructible, so an array supplies the indexing and iteration, as in setupTests
    return Object.assign([rectOf(this)], { item: (index: number) => (index === 0 ? rectOf(this) : null) })
  })

  onTestFinished(() => {
    boundingClientRect.mockRestore()
    clientRects.mockRestore()
  })
}

export default layOutText
