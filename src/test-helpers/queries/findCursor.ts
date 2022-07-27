import { findAllByLabelText } from '@testing-library/dom'

/** Returns the cursor thought or null if it doesn't exist. */
export const findCursor = async () => {
  const editingContainer = document.querySelector('.editing') as HTMLElement
  if (!editingContainer) return null
  const thoughts = await findAllByLabelText(editingContainer, 'thought')
  return thoughts[0]
}
