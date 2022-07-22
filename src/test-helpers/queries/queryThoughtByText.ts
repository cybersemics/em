import { queryAllByText, screen } from '@testing-library/dom'

/**
 * Gets a thought that matches the given value.
 */
export const queryThoughtByText = async (value: string, container?: HTMLElement | null) => {
  const thoughtNodes = await (container
    ? queryAllByText(container!, value, { exact: true })
    : screen.queryAllByText(value, { exact: true }))
  return thoughtNodes.find(t => t.hasAttribute('contenteditable')) || null
}
