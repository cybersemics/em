import { useRef } from 'react'
import { useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import IconType from '../../@types/Icon'
import ColorPicker from '../ColorPicker'
import TextColorIcon from './TextColor'

/** Text Color Icon Component with popup ColorPicker. */
const Icon = ({ size = 20, style }: IconType) => {
  const showColorPicker = useSelector(state => state.showColorPicker)
  const toolbarPopupRef = useRef<HTMLDivElement>(null)

  return (
    <div>
      <TextColorIcon size={size} style={style} />
      <CSSTransition
        nodeRef={toolbarPopupRef}
        in={showColorPicker}
        timeout={200}
        classNames='fade'
        exit={false}
        unmountOnExit
      >
        <div
          ref={toolbarPopupRef}
          className='z-index-stack toolbar-popup'
          style={{
            position: 'relative',
            // eyeballing it to get font sizes 14–24 to look right
            left: (size * (size + 90)) / 200 + 600 / (size * size),
            marginTop: size * 1.2 - 10,
            // position fixed or absolute causes the ColorPicker to get clipped by the toolbar's overflow-x: scroll
            // ideally we want overflow-x:scroll and overflow-y:visible, but Safari does not differing allow overflow-x and overflow-y
            // instead, keep position:static but set the width to 0
            // this will increase the height of the toolbar so the ColorPicker does not get clipped without taking up horizontal space
            width: 0,
          }}
        >
          <ColorPicker fontSize={size} style={{ transform: `translate(-50%)` }} />
        </div>
      </CSSTransition>
    </div>
  )
}

export default Icon
