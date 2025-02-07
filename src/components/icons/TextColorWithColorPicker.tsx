import { useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'
import ColorPicker from '../ColorPicker'
import FadeTransition from '../FadeTransition'
import TextColorIcon from './TextColor'

/** Text Color Icon with popup ColorPicker. */
const TextColorWithColorPicker = ({ size = 18, style, cssRaw }: IconType) => {
  const showColorPicker = useSelector(state => state.showColorPicker)
  const toolbarPopupRef = useRef<HTMLDivElement>(null)

  return (
    <div>
      <TextColorIcon
        size={size}
        style={style}
        cssRaw={cssRaw}
        animated={showColorPicker}
        fill={style?.fill || token('colors.fg')}
      />
      <FadeTransition duration='fast' nodeRef={toolbarPopupRef} in={showColorPicker} exit={false} unmountOnExit>
        <div
          ref={toolbarPopupRef}
          className={css({
            zIndex: 'stack',
            position: 'relative',
            // position fixed or absolute causes the ColorPicker to get clipped by the toolbar's overflow-x: scroll
            // ideally we want overflow-x:scroll and overflow-y:visible, but Safari does not differing allow overflow-x and overflow-y
            // instead, keep position:static but set the width to 0
            // this will increase the height of the toolbar so the ColorPicker does not get clipped without taking up horizontal space
            width: 0,
          })}
          style={{
            // eyeballing it to get font sizes 14–24 to look right
            left: (size * (size + 90)) / 200 + 600 / (size * size),
            marginTop: size * 1.2 - 10,
          }}
        >
          <ColorPicker fontSize={size} cssRaw={css.raw({ transform: `translate(-50%)` })} />
        </div>
      </FadeTransition>
    </div>
  )
}

export default TextColorWithColorPicker
