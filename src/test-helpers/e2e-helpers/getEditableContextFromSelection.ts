import { Page } from 'puppeteer'

/**
 * Get editable context hash from the selection.
 */
const getEditableContextHashFromSelection = (page: Page) => page.evaluate(() => {
  const focusNode = document.getSelection()?.focusNode

  if (!focusNode) throw new Error('No selection found.')

  const editableNode = (focusNode.nodeName === '#text' ? focusNode.parentNode : focusNode) as HTMLElement

  const isLegitEditableNode = editableNode?.nodeName === 'DIV' && editableNode.classList && editableNode.classList.contains('editable')
  if (!isLegitEditableNode) throw new Error('Focus node is not of type Editable.')

  const editableContextHash = Array.from(editableNode.classList).find(className => className.startsWith('editable-'))

  if (!editableContextHash) throw new Error('Classname with editable context hash not found')

  return editableContextHash.split('editable-')[1]
})

export default getEditableContextHashFromSelection
