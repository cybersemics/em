import { CSSProperties } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { SystemStyleObject } from '../../styled-system/types'
import fastClick from '../util/fastClick'

interface ChevronImgProps {
  onClickHandle: () => void
  cssRaw?: SystemStyleObject
  additonalStyle?: CSSProperties
}

/** A downward facing chevron. */
const ChevronImg = ({ onClickHandle, cssRaw, additonalStyle }: ChevronImgProps) => (
  <svg
    viewBox='0 0 48 48'
    height='22px'
    width='22px'
    style={additonalStyle}
    {...fastClick(onClickHandle, { enableHaptics: false })}
    className={css({ cursor: 'pointer' }, cssRaw)}
  >
    <path d='M14.83 16.42l9.17 9.17 9.17-9.17 2.83 2.83-12 12-12-12z' fill={token('colors.fg')} />
    <path d='M0-.75h48v48h-48z' fill='none' />
  </svg>
)

export default ChevronImg
