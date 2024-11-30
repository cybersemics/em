import { useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import IconType from '../../@types/IconType'
import FadeTransition from '../FadeTransition'
import LetterCasePicker from '../LetterCasePicker'
import LetterCaseIcon from './LetterCaseIcon'

/** Text Color Icon Component with popup ColorPicker. */
const Icon = ({ size = 20, style, cssRaw }: IconType) => {
  const showLetterCase = useSelector(state => state.showLetterCase)
  const toolbarPopupRef = useRef<HTMLDivElement>(null)

  return (
    <div>
      <LetterCaseIcon size={size} style={style} cssRaw={cssRaw} />
      <FadeTransition duration='fast' nodeRef={toolbarPopupRef} in={showLetterCase} exit={false} unmountOnExit>
        <div
          className={css({
            position: 'relative',
            zIndex: 'stack',
            // position fixed or absolute causes the ColorPicker to get clipped by the toolbar's overflow-x: scroll
            // ideally we want overflow-x:scroll and overflow-y:visible, but Safari does not differing allow overflow-x and overflow-y
            // instead, keep position:static but set the width to 0
            // this will increase the height of the toolbar so the ColorPicker does not get clipped without taking up horizontal space
            width: 0,
          })}
          ref={toolbarPopupRef}
          style={{
            // eyeballing it to get font sizes 14–24 to look right
            left: (size * (size + 90)) / 200 + 600 / (size * size),
            marginTop: size * 1.2 - 10,
          }}
        >
          <LetterCasePicker fontSize={size} cssRaw={css.raw({ transform: `translate(-50%)` })} />
        </div>
      </FadeTransition>
    </div>
  )
}

export default Icon
