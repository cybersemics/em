import { RefObject } from 'react'
import { useSelector } from 'react-redux'
import { formattingBarOptionsRecipe } from '../../styled-system/recipes'
import { commandById, executeCommandWithMulticursor } from '../commands'
import useLastShown from '../hooks/useLastShown'
import getHeadingLevel from '../selectors/getHeadingLevel'
import selectedPaths from '../selectors/selectedPaths'
import head from '../util/head'
import FormattingBarPickerButton from './FormattingBarPickerButton'
import FormattingBarPopover from './FormattingBarPopover'
import Heading1Icon from './icons/Heading1Icon'
import Heading2Icon from './icons/Heading2Icon'
import Heading3Icon from './icons/Heading3Icon'
import Heading4Icon from './icons/Heading4Icon'
import Heading5Icon from './icons/Heading5Icon'
import NormalTextIcon from './icons/NormalTextIcon'

/** The heading options, from normal text through the smallest heading. */
const options = [
  { level: 0, Icon: NormalTextIcon },
  { level: 1, Icon: Heading1Icon },
  { level: 2, Icon: Heading2Icon },
  { level: 3, Icon: Heading3Icon },
  { level: 4, Icon: Heading4Icon },
  { level: 5, Icon: Heading5Icon },
] as const

/** The Formatting Bar's heading picker, using the existing heading commands for formatting and undo. */
const FormattingBarHeadingPicker = ({
  anchorRef,
  iconSize,
  show,
  onClose,
}: {
  anchorRef: RefObject<HTMLElement | null>
  iconSize: number
  show: boolean
  onClose: () => void
}) => {
  // Only computed while the picker is open, and held while it fades out after closing.
  const selected = useLastShown(
    useSelector(state => {
      if (!show) return null
      const levels = selectedPaths(state).map(path => getHeadingLevel(state, head(path)))
      return levels.length > 0 && levels.every(level => level === levels[0]) ? levels[0] : null
    }),
    show,
  )

  return (
    <FormattingBarPopover
      anchorRef={anchorRef}
      iconSize={iconSize}
      ariaLabel='Heading Picker'
      show={show}
      onClose={onClose}
      title='Text Style'
      description='Turn your thoughts into headings of different sizes.'
    >
      <div aria-label='heading swatches' className={formattingBarOptionsRecipe()}>
        {options.map(({ level, Icon }) => (
          <FormattingBarPickerButton
            key={level}
            Icon={Icon}
            iconSize={iconSize}
            label={commandById(`heading${level}`).label}
            selected={selected === level}
            selectionGroup='heading'
            onSelect={event =>
              executeCommandWithMulticursor(commandById(`heading${level}`), { type: 'formattingBar', event })
            }
          />
        ))}
      </div>
    </FormattingBarPopover>
  )
}

export default FormattingBarHeadingPicker
