import { useMemo } from 'react'
import { css, cx } from '../../styled-system/css'
import { editableRecipe } from '../../styled-system/recipes'
import caretOffsetStore from '../stores/caretOffsetStore'
import FauxCaret from './FauxCaret'

/** Returns a copy of the given node containing only the first n characters of its rendered text, along with the number
 * of characters consumed. Formatting tags and nested elements are preserved, and an element that is only partially
 * consumed is kept with its truncated contents, e.g. truncating `<b>bold</b> text` at 2 yields `<b>bo</b>`. */
const truncateNode = (node: Node, n: number): { node: Node; consumed: number } => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').slice(0, n)
    return { node: document.createTextNode(text), consumed: text.length }
  }

  const clone = node.cloneNode(false)
  const consumed = Array.from(node.childNodes).reduce((consumed, child) => {
    if (consumed >= n) return consumed
    const truncated = truncateNode(child, n - consumed)
    clone.appendChild(truncated.node)
    return consumed + truncated.consumed
  }, 0)

  return { node: clone, consumed }
}

/** Returns the given html truncated to the first n characters of its rendered text, preserving formatting tags and
 * nested elements. */
const truncateHtml = (html: string, n: number): string => {
  const source = document.createElement('div')
  source.innerHTML = html
  return (truncateNode(source, n).node as HTMLElement).innerHTML
}

/**
 * Overlays a faux caret on a thought that is being edited as part of a multiselection but does not hold the real caret.
 *
 * Only one thought can hold the browser caret, so the other thoughts of the multiselection render this to show that
 * they are being edited too (see Clear Thought). It is positioned by laying out the thought's own rendered html,
 * truncated at the real caret's offset, in an invisible copy of the editable — same recipe, so the same padding, font,
 * and line height. The browser therefore resolves the caret's x, y, line wrapping, and half-leading exactly as it does
 * for the real caret, including within formatted text.
 *
 * The html is the exact content of the editable it overlays, not the value of the thought that holds the real caret.
 * The two are the same once an edit has been mirrored across the multiselection, but they differ before the first
 * keystroke, and while the thoughts are cleared the editable is empty even though the thought still has its value.
 */
const MulticursorFauxCaret = ({ html, className }: { html: string; className?: string }) => {
  const offset = caretOffsetStore.useState()

  const prefix = useMemo(() => (offset === null ? '' : truncateHtml(html, offset)), [offset, html])

  return offset === null ? null : (
    <span
      aria-hidden
      data-testid='faux-caret-multicursor'
      className={cx(
        editableRecipe(),
        className,
        css({
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          pointerEvents: 'none',
          // the invisible prefix must not be selectable or hit-testable, and must never be read as thought content
          userSelect: 'none',
        }),
      )}
    >
      <span className={css({ visibility: 'hidden' })} dangerouslySetInnerHTML={{ __html: prefix }} />
      {/* zero width so that the caret glyph renders at the end of the prefix without occupying layout space, which
          would otherwise push it onto the next line when the prefix fills the line */}
      <span className={css({ display: 'inline-block', width: 0 })}>
        <FauxCaret caretType='multicursorStart' />
      </span>
    </span>
  )
}

export default MulticursorFauxCaret
