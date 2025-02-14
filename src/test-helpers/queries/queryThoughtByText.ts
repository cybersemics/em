import { queryAllByText, screen } from '@testing-library/dom'

/**
 * Gets a thought with the given value, or null if it does not exist.
 */
export default async function queryThoughtByText(value: string, container?: HTMLElement | null) {
  const thoughtNodes = await (container
    ? queryAllByText(container!, value, { exact: true })
    : screen.queryAllByText(value, { exact: true }))
  return thoughtNodes.find(t => t.hasAttribute('contenteditable')) || null
}
