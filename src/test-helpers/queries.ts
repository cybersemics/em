import { findAllByText, screen } from '@testing-library/dom'

/**
 * Gets a thought by value.
 */
export const findThoughtByText = async (value: string, container?: HTMLElement) => {
  const thoughtNodes = await (container ? findAllByText(container!, value, { exact: true }) : screen.findAllByText(value, { exact: true }))
  return thoughtNodes.find(t => t.hasAttribute('contenteditable'))
}

/**
 * Gets a thought by value.
 */
export const findThoughtsByText = async (value: string, container?: HTMLElement) => {
  const thoughtNodes = await (container ? findAllByText(container!, value, { exact: true }) : screen.findAllByText(value, { exact: true }))
  return thoughtNodes.filter(t => t.hasAttribute('contenteditable'))
}
