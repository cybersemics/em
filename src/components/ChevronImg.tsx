import { CSSProperties } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { SystemStyleObject } from '../../styled-system/types'
import fastClick from '../util/fastClick'

const PATHS = {
  down: {
    d: 'M14.83 16.42l9.17 9.17 9.17-9.17 2.83 2.83-12 12-12-12z',
    viewBox: '12 16.42 24 14.83',
  },
  up: {
    d: 'M14.83 31.58l9.17-9.17 9.17 9.17 2.83-2.83-12-12-12 12z',
    viewBox: '12 16.75 24 14.83',
  },
}

/** Stroke width as a fraction of the rendered height when rounded draws a thick open chevron. */
const ROUNDED_STROKE_RATIO = 0.45

/** Returns an open chevron path that fits within the rendered svg box. */
const roundedPath = (direction: 'up' | 'down', width: number, height: number, strokeWidth: number) => {
  const inset = strokeWidth / 2
  const yApex = direction === 'up' ? inset : height - inset
  const yEnds = direction === 'up' ? height - inset : inset
  return `M${inset} ${yEnds}L${width / 2} ${yApex}L${width - inset} ${yEnds}`
}

interface ChevronImgProps {
  /** Makes the chevron itself clickable. Omit when an ancestor already handles the click, so that the svg does not become a nested role='button'. */
  onClickHandle?: () => void
  cssRaw?: SystemStyleObject
  additonalStyle?: CSSProperties
  /** Which way the chevron points. Defaults to 'down'. */
  direction?: 'up' | 'down'
  /** Overrides the chevron colour. */
  fill?: string
  /** Height in px. Defaults to 22. */
  height?: number
  /** Width in px. Defaults to 22. */
  width?: number
  /** Rounds the tips of the icon. Defaults to false. */
  rounded?: boolean
}

/** A downward facing chevron. */
const ChevronImg = ({
  onClickHandle,
  cssRaw,
  additonalStyle,
  direction = 'down',
  fill,
  height = 22,
  width = 22,
  rounded,
}: ChevronImgProps) => {
  const color = fill || token('colors.fg')
  const { d, viewBox } = PATHS[direction]
  const roundedStrokeWidth = height * ROUNDED_STROKE_RATIO

  return (
    <svg
      viewBox={rounded ? `0 0 ${width} ${height}` : viewBox}
      preserveAspectRatio='none'
      height={`${height}px`}
      width={`${width}px`}
      style={additonalStyle}
      {...(onClickHandle ? fastClick(onClickHandle, { enableHaptics: false }) : null)}
      className={css({ cursor: 'pointer' }, cssRaw)}
    >
      {rounded ? (
        <path
          d={roundedPath(direction, width, height, roundedStrokeWidth)}
          fill='none'
          stroke={color}
          strokeWidth={roundedStrokeWidth}
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      ) : (
        <path d={d} fill={color} />
      )}
    </svg>
  )
}

export default ChevronImg
