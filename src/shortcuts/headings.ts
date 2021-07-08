import { isDocumentEditable } from '../util'
import { heading } from '../action-creators'
import { Shortcut } from '../types'

export const headingLabels = {
  1: 'large',
  2: 'medium-large',
  3: 'medium',
  4: 'medium-small',
  5: 'small',
}

export type HeadingLevel = 0 | 1 | 2 | 3 | 4 | 5

/** Creates a heading shortcut at a given level (h1, h2, etc). */
const headingShortcut = (level: HeadingLevel): Shortcut => ({
  id: `heading${level}`,
  label: `Heading ${level}`,
  description: level ? `Turns the thought into a ${headingLabels[level]} heading.` : 'Sets the thought to normal text.',
  keyboard: { key: level.toString(), meta: true, alt: true },
  canExecute: getState => !!getState().cursor && isDocumentEditable(),
  exec: dispatch => {
    dispatch(heading({ level }))
  },
})

export const heading0 = headingShortcut(0)
export const heading1 = headingShortcut(1)
export const heading2 = headingShortcut(2)
export const heading3 = headingShortcut(3)
export const heading4 = headingShortcut(4)
export const heading5 = headingShortcut(5)
