import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'
import ColorPicker from '../ColorPicker'
import TextColorIcon from './TextColor'

/** Text Color Icon with popup Picker. */
const TextColorWithColorPicker = ({ size = 18, style, fill, cssRaw }: IconType) => {
  const showColorPicker = useSelector(state => state.showColorPicker)

  // A flex column rather than a block, so the icon is not set on a line of text, whose room for descenders would make
  // the wrapper taller than the icon and lift the icon off centre in the Formatting Bar. The picker still opens below.
  return (
    <div className={css({ display: 'flex', flexDirection: 'column' })}>
      <TextColorIcon
        size={size}
        style={style}
        cssRaw={cssRaw}
        animated={showColorPicker}
        fill={style?.fill || fill || token('colors.fg')}
      />
      <ColorPicker size={size} />
    </div>
  )
}

export default TextColorWithColorPicker
