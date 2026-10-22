/**
 * Reads back the computed ::before style of the placeholder that Clear Thought renders in place of the thought.
 * Uses the global browser object from WDIO.
 */
const getClearedPlaceholderStyle = (): Promise<{ content: string; fontStyle: string; transform: string }> => {
  return browser.execute(() => {
    const editable = document.querySelector('[data-editable][data-placeholder-cleared]')
    if (!editable) throw new Error('cleared thought not found')
    const style = getComputedStyle(editable, '::before')
    return { content: style.content, fontStyle: style.fontStyle, transform: style.transform }
  })
}

export default getClearedPlaceholderStyle
