import { findAllByText, screen } from '@testing-library/dom'

/**
 * Waits for a thought with the given value. Times out if it does not exist.
 */
const findThoughtByText = async (value: string, container?: HTMLElement | null) => {
  const thoughtNodes = await (container
    ? findAllByText(container, value, { exact: true })
    : screen.findAllByText(value, { exact: true }))
  return thoughtNodes.find(t => t.hasAttribute('contenteditable')) || null
}

export default findThoughtByText
