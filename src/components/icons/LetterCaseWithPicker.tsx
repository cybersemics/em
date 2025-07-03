import IconType from '../../@types/IconType'
import LetterCasePicker from '../LetterCasePicker'
import LetterCaseIcon from './LetterCaseIcon'

/** Letter Case Icon Component with popup Picker. */
const Icon = ({ size = 20, style, fill, cssRaw }: IconType) => {
  return (
    <div>
      <LetterCaseIcon size={size} style={style} fill={fill} cssRaw={cssRaw} />
      <LetterCasePicker size={size} />
    </div>
  )
}

export default Icon
