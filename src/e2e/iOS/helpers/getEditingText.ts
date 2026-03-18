/**
 * Get the thought value that cursor on.
 * Uses the global browser object from WDIO.
 */
const getEditingText = (): Promise<string | undefined> => {
  return browser.execute(() => {
    return document.querySelector('[data-editing=true] [data-editable]')?.innerHTML
  })
}

export default getEditingText
