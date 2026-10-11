/**
 * Get the thought value that cursor on.
 * Uses the global browser object from WDIO.
 */
const getEditingText = async (): Promise<string | undefined> => {
  // WebDriver has no undefined on the wire, so a missing element arrives as null.
  const text = await browser.execute(() => {
    return document.querySelector('[data-editing=true] [data-editable]')?.innerHTML
  })
  return text ?? undefined
}

export default getEditingText
