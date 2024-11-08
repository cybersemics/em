import { findAllByLabelText } from '@testing-library/dom'

/** Returns the cursor thought or null if it doesn't exist. */
const findCursor = async () => {
  const editingContainer = document.querySelector('[data-editing=true]') as HTMLElement
  if (!editingContainer) return null
  const thoughts = await findAllByLabelText(editingContainer, 'thought')
  return thoughts[0]
}

export default findCursor
