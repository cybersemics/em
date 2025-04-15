import { page } from '../setup'

/**
 * Click the note for the given note value. Waits for the note at the beginning in case it hasn't been rendered yet.
 */
const clickNote = async (value: string) => {
  // use a short timeout to make time for a render and async page communication
  // precede clickNote by a longer waitForEditable for steps that are known to take time, such as refreshing the page
  const editableNode = await page.waitForFunction(
    (value: string) => {
      return Array.from(document.querySelectorAll('[aria-label=note-editable]')).find(
        element => element.innerHTML === value,
      )
    },
    {
      timeout: 1000,
    },
    value,
  )
  // @ts-expect-error - https://github.com/puppeteer/puppeteer/issues/8852
  await editableNode.asElement()?.click()
}

export default clickNote
