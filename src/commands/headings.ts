import Command from '../@types/Command'
import { headingActionCreator as heading } from '../actions/heading'
import Heading1Icon from '../components/icons/Heading1Icon'
import Heading2Icon from '../components/icons/Heading2Icon'
import Heading3Icon from '../components/icons/Heading3Icon'
import Heading4Icon from '../components/icons/Heading4Icon'
import Heading5Icon from '../components/icons/Heading5Icon'
import NormalTextIcon from '../components/icons/NormalTextIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

export const headingLabels = {
  1: 'large',
  2: 'medium-large',
  3: 'medium',
  4: 'medium-small',
  5: 'small',
}

// Choose the SVG icon based on the heading level
const iconMap = {
  0: NormalTextIcon,
  1: Heading1Icon,
  2: Heading2Icon,
  3: Heading3Icon,
  4: Heading4Icon,
  5: Heading5Icon,
}
export type HeadingLevel = 0 | 1 | 2 | 3 | 4 | 5

/** Creates a heading command at a given level (h1, h2, etc). */
const headingShortcut = (level: HeadingLevel): Command => ({
  id: `heading${level}`,
  label: level === 0 ? 'Normal Text' : `Heading ${level}`,
  description: level
    ? `Turns the thought into a ${headingLabels[level]} heading.${
        level === 3
          ? ' Perhaps a pattern is emerging?'
          : level === 4
            ? ' You get the idea.'
            : level === 5
              ? ' Impressive that you read this far.'
              : ''
      }`
    : 'Sets a heading to normal text.',
  keyboard: { key: level.toString(), meta: true, alt: true },
  multicursor: true,
  svg: iconMap[level], // Assign the icon based on the level
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
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
