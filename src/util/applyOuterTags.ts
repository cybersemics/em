import isFormattingElement from './isFormattingElement'

/** Descends a chain of formatting elements that each wrap the whole thought, returning the innermost one. */
const innermostWrapper = (element: HTMLElement): HTMLElement =>
  element.childNodes.length === 1 && isFormattingElement(element.firstChild)
    ? innermostWrapper(element.firstChild)
    : element

/**
 * If a value is wrapped in formatting nodes, transfers those wrappers onto another value. Every wrapper in the chain is
 * preserved, so a thought formatted with several marks (e.g. bold + underline + text color) keeps all of them. Returns
 * the new value unchanged when the wrappers do not cover the whole of the old value, since there is then no single
 * formatting the new value can inherit.
 *
 * @param newValue The value to wrap.
 * @param oldValue The value whose outer formatting is transferred.
 */
const applyOuterTags = (newValue: string, oldValue: string): string => {
  const div = document.createElement('div')
  div.innerHTML = oldValue

  if (div.childNodes.length > 1 || !isFormattingElement(div.firstChild)) return newValue

  innermostWrapper(div.firstChild).innerHTML = newValue

  return div.firstChild.outerHTML
}

export default applyOuterTags
