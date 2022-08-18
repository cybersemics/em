import React from 'react'
import { useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import IconType from '../../@types/Icon'
import State from '../../@types/State'
import ColorPicker from '../ColorPicker'
import TextColorIcon from './TextColor'

/** Text Color Icon Component with popup ColorPicker. */
const Icon = ({ size = 20, style }: IconType) => {
  const showColorPicker = useSelector((state: State) => state.showColorPicker)
  return (
    <div>
      <TextColorIcon size={size} style={style} />
      <CSSTransition in={showColorPicker} timeout={200} classNames='fade' exit={false} unmountOnExit>
        <div
          className='z-index-stack toolbar-popup'
          style={{
            marginLeft: size / 2,
            marginTop: size / 2 + 5,
            // required to avoid being clipped by toolbar's overflow-x: scroll
            // does not allow overflow-y: visible at the same time for some reason
            position: 'fixed',
            // % margin-left does not work on position fixed
            transform: `translate(calc(-50%), 0)`,
          }}
        >
          <ColorPicker fontSize={size} />
        </div>
      </CSSTransition>
    </div>
  )
}

export default Icon
