import { queryAllByText, screen } from '@testing-library/dom'

/**
 * Gets all the thoughts which match the given value.
 */
export const queryAllThoughtsByText = async (value: string, container?: HTMLElement | null) => {
  const thoughtNodes = await (container
    ? queryAllByText(container!, value, { exact: true })
    : screen.queryAllByText(value, { exact: true }))
  return thoughtNodes.filter(t => t.hasAttribute('contenteditable'))
}
