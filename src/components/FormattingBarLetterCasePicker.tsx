import { RefObject } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { formattingBarOptionsRecipe } from '../../styled-system/recipes'
import LetterCaseType from '../@types/LetterCaseType'
import { formatLetterCaseActionCreator as formatLetterCase } from '../actions/formatLetterCase'
import useLastShown from '../hooks/useLastShown'
import getSelectedLetterCase from '../selectors/getSelectedLetterCase'
import FormattingBarPickerButton from './FormattingBarPickerButton'
import FormattingBarPopover from './FormattingBarPopover'
import LowerCaseIcon from './icons/LowerCaseIcon'
import SentenceCaseIcon from './icons/SentenceCaseIcon'
import TitleCaseIcon from './icons/TitleCaseIcon'
import UpperCaseIcon from './icons/UpperCaseIcon'

/** The letter-case options in their display order. */
const options = [
  { type: 'LowerCase', Icon: LowerCaseIcon },
  { type: 'UpperCase', Icon: UpperCaseIcon },
  { type: 'SentenceCase', Icon: SentenceCaseIcon },
  { type: 'TitleCase', Icon: TitleCaseIcon },
] satisfies { type: LetterCaseType; Icon: typeof LowerCaseIcon }[]

/** The Formatting Bar's letter-case picker, independent of the Toolbar's picker presentation. */
const FormattingBarLetterCasePicker = ({
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
  const dispatch = useDispatch()
  // Only computed while the picker is open, and held while it fades out after closing.
  const selected = useLastShown(
    useSelector(state => (show ? getSelectedLetterCase(state) : '')),
    show,
  )

  return (
    <FormattingBarPopover
      anchorRef={anchorRef}
      iconSize={iconSize}
      ariaLabel='Letter Case Picker'
      show={show}
      onClose={onClose}
      title='Text Case'
      description='Change the capitalization of your thoughts.'
    >
      <div aria-label='letter case swatches' className={formattingBarOptionsRecipe()}>
        {options.map(({ type, Icon }) => (
          <FormattingBarPickerButton
            key={type}
            Icon={Icon}
            iconSize={iconSize}
            label={type}
            selected={selected === type}
            selectionGroup='letterCase'
            onSelect={() => dispatch(formatLetterCase(type))}
          />
        ))}
      </div>
    </FormattingBarPopover>
  )
}

export default FormattingBarLetterCasePicker
