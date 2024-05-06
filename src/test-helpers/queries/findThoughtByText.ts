import { findAllByText, screen } from '@testing-library/dom'

/**
 * Gets a thought that matches the given value.
 */
export const findThoughtByText = async (value: string, container?: HTMLElement | null) => {
  const thoughtNodes = await (container
    ? findAllByText(container, value, { exact: true })
    : screen.findAllByText(value, { exact: true }))
  return thoughtNodes.find(t => t.hasAttribute('contenteditable')) || null
}
