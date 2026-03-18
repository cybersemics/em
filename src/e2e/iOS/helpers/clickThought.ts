import getEditable from './getEditable.js'

/**
 * Click the thought for the given thought value.
 * Uses the global browser object from WDIO.
 */
const clickThought = async (value: string) => {
  const editableNode = await getEditable(value)

  if (!editableNode) throw new Error(`editable node for the given value(${value}) not found.`)

  await editableNode.click()
}

export default clickThought
