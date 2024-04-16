import { CSSProperties } from 'react'
import fastClick from '../util/fastClick'

interface ChevronImgProps {
  dark: boolean
  onClickHandle: () => void
  className?: string
  additonalStyle?: CSSProperties
}

/** A downward facing chevron. */
const ChevronImg = ({ dark, onClickHandle, className, additonalStyle }: ChevronImgProps) => (
  <svg
    viewBox='0 0 48 48'
    height='22px'
    width='22px'
    style={{ ...additonalStyle, cursor: 'pointer' }}
    {...fastClick(onClickHandle)}
    className={className || ''}
  >
    <path d='M14.83 16.42l9.17 9.17 9.17-9.17 2.83 2.83-12 12-12-12z' fill={dark ? '#fff' : '#000'} />
    <path d='M0-.75h48v48h-48z' fill='none' />
  </svg>
)

export default ChevronImg
