import { Browser } from 'webdriverio'
import getEditable from './getEditable'

/** Click the thought for the given thought value. */
const clickThought = async (browser: Browser<'async'>, value: string) => {
  const editableNode = await getEditable(browser, value)

  if (!editableNode) throw new Error(`editable node for the given value(${value}) not found.`)

  await editableNode.click()
}

export default clickThought
