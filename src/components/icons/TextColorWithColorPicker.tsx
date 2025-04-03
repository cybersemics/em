import { useSelector } from 'react-redux'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'
import ColorPicker from '../ColorPicker'
import TextColorIcon from './TextColor'

/** Text Color Icon with popup Picker. */
const TextColorWithColorPicker = ({ size = 18, style, cssRaw }: IconType) => {
  const showColorPicker = useSelector(state => state.showColorPicker)

  return (
    <div>
      <TextColorIcon
        size={size}
        style={style}
        cssRaw={cssRaw}
        animated={showColorPicker}
        fill={style?.fill || token('colors.fg')}
      />
      <ColorPicker size={size} />
    </div>
  )
}

export default TextColorWithColorPicker
