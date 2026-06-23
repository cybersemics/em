import { page } from '../setup'

/**
 * Click the note for the given note value. Waits for the note at the beginning in case it hasn't been rendered yet.
 */
const clickNote = async (value: string) => {
  const noteNode = await page.waitForFunction(
    (value: string) => {
      return Array.from(document.querySelectorAll('[aria-label="note-editable"]')).find(
        element => element.innerHTML === value,
      )
    },
    {},
    value,
  )
  // @ts-expect-error - https://github.com/puppeteer/puppeteer/issues/8852
  await noteNode.asElement()?.click()
}

export default clickNote
