import { fetchPage } from './setup'
import waitForEditable from './waitForEditable'

/** Wait for an editable to become hidden by checking the color alpha. */
// TODO: Broken after virtualizing thoughts
async function waitForHiddenEditable(value: string) {
  const editableElement = await waitForEditable(value)
  await fetchPage().waitForFunction(
    (element: Element) => {
      return window.getComputedStyle(element, null).color === 'rgba(255, 255, 255, 0)'
    },
    {},
    editableElement.asElement()! as unknown as Element,
  )
}

export default waitForHiddenEditable
