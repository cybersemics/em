import React, { CSSProperties } from 'react'
import ArrowDownBlack from '../images/iconfinder_ic_keyboard_arrow_down_black_352466.svg'
import ArrowDownWhite from '../images/keyboard_arrow_down_352466.svg'

interface ChevronImgProps {
  dark: boolean
  onClickHandle: () => void
  className?: string
  additonalStyle?: CSSProperties
}

/**
 * Loading component.
 */
const ChevronImg = ({ dark, onClickHandle, className, additonalStyle }: ChevronImgProps) => (
  <img
    src={dark ? ArrowDownWhite : ArrowDownBlack}
    alt='Arrow'
    height='22px'
    width='22px'
    style={{ ...additonalStyle, cursor: 'pointer' }}
    onClick={onClickHandle}
    className={className || ''}
  />
)

export default ChevronImg
