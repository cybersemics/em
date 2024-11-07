import { CSSProperties } from 'react'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import fastClick from '../util/fastClick'

interface ChevronImgProps {
  dark: boolean
  onClickHandle: () => void
  cssRaw?: SystemStyleObject
  additonalStyle?: CSSProperties
}

/** A downward facing chevron. */
const ChevronImg = ({ dark, onClickHandle, cssRaw, additonalStyle }: ChevronImgProps) => (
  <svg
    viewBox='0 0 48 48'
    height='22px'
    width='22px'
    style={additonalStyle}
    {...fastClick(onClickHandle)}
    className={css({ cursor: 'pointer' }, cssRaw)}
  >
    <path d='M14.83 16.42l9.17 9.17 9.17-9.17 2.83 2.83-12 12-12-12z' fill={dark ? '#fff' : '#000'} />
    <path d='M0-.75h48v48h-48z' fill='none' />
  </svg>
)

export default ChevronImg
