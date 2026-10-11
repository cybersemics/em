import { css } from '../../../styled-system/css'
import IconType from '../../@types/IconType'
import LetterCasePicker from '../LetterCasePicker'
import LetterCaseIcon from './LetterCaseIcon'

/** Letter Case Icon Component with popup Picker. */
const Icon = ({ size = 20, style, fill, cssRaw }: IconType) => {
  // A flex column rather than a block, so the icon is not set on a line of text, whose room for descenders would make
  // the wrapper taller than the icon and lift the icon off centre in the Formatting Bar. The picker still opens below.
  return (
    <div className={css({ display: 'flex', flexDirection: 'column' })}>
      <LetterCaseIcon size={size} style={style} fill={fill} cssRaw={cssRaw} />
      <LetterCasePicker size={size} />
    </div>
  )
}

export default Icon
