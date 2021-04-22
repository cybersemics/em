import { Page } from 'puppeteer'
import getEditable from './getEditable'

/**
 * Click the thought for the given thought value.
 */
const clickThought = async (page: Page, value: string) => {

  const editableNode = await getEditable(page, value)

  if (!editableNode) throw new Error('editable node for the given value not found.')

  await editableNode.asElement()?.click()
}

export default clickThought
