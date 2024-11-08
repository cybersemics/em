import { findAllByText, screen } from '@testing-library/dom'

/**
 * Gets all the thoughts which match the given value.
 */
export default async function findAllThoughtsByText(value: string, container?: HTMLElement | null) {
  const thoughtNodes = await (container
    ? findAllByText(container!, value, { exact: true })
    : screen.findAllByText(value, { exact: true }))
  return thoughtNodes.filter(t => t.hasAttribute('contenteditable'))
}
