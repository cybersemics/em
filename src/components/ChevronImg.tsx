import { CSSProperties } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { SystemStyleObject } from '../../styled-system/types'
import fastClick from '../util/fastClick'

/** How thick a stroke to use for rounding a filled chevron when the caller asks for rounded edges without setting a thickness of its own. */
const ROUNDING_STROKE = 2

/** Line weight of a stroked chevron when the caller does not set one. */
const STROKED_WEIGHT = 2

/** The filled chevron pointing each way, with the bounds of the path itself. The bounds are what the viewBox is cropped to when the chevron is stretched, since the full 48x48 canvas is mostly empty space. `up` sits a third of a unit lower than `down` because the original path is not quite centred in that canvas and `up` is its mirror about the centre. */
const FILLED = {
  down: {
    d: 'M14.83 16.42l9.17 9.17 9.17-9.17 2.83 2.83-12 12-12-12z',
    bounds: { x: 12, y: 16.42, width: 24, height: 14.83 },
  },
  up: {
    d: 'M14.83 31.58l9.17-9.17 9.17 9.17 2.83-2.83-12-12-12 12z',
    bounds: { x: 12, y: 16.75, width: 24, height: 14.83 },
  },
}

/** The stroked chevron, drawn to fit the given box exactly. The line is inset by half its weight so that its round caps land flush against the edges of the box instead of overflowing them, which is why the chevron never needs stretching to fill a box of any proportion. */
const strokedPath = (direction: 'up' | 'down', width: number, height: number, strokeWidth: number) => {
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
  /** Overrides the chevron colour — the fill of a filled chevron, or the line of a stroked one. Defaults to the fg token. */
  fill?: string
  /** Height in px. Defaults to 22. */
  height?: number
  /** Rounds the tips and the apex. Defaults to true for the stroked variant, where the tips are line ends that a round cap turns into semicircles, and false for the filled variant, where rounding has to be done by stroking the outline and so makes the chevron slightly heavier. A filled chevron can never round as smoothly as a stroked one: its tips are flat edges of the outline, which stroking offsets outwards but does not shorten. */
  rounded?: boolean
  /** Crops the viewBox to the path's own bounds and stretches it to fill width x height. Filled only — a stroked chevron is drawn to fit the box already. Without this the filled chevron keeps its 1.6:1 proportions and is letterboxed inside the box. */
  stretch?: boolean
  /** Line weight of a stroked chevron. On a filled chevron the weight is already baked into the outline, so this thickens it rather than setting it. */
  strokeWidth?: number
  /** Which mark to draw. 'filled' is the solid chevron with flat tips; 'stroked' is an open line whose ends can be rounded. Defaults to 'filled'. */
  variant?: 'filled' | 'stroked'
  /** Width in px. Defaults to 22. */
  width?: number
}

/** A downward facing chevron. */
const ChevronImg = ({
  onClickHandle,
  cssRaw,
  additonalStyle,
  direction = 'down',
  fill,
  height = 22,
  rounded,
  stretch,
  strokeWidth,
  variant = 'filled',
  width = 22,
}: ChevronImgProps) => {
  const color = fill || token('colors.fg')
  const isStroked = variant === 'stroked'
  const isRounded = rounded ?? isStroked
  const weight = strokeWidth ?? (isStroked ? STROKED_WEIGHT : isRounded ? ROUNDING_STROKE : 0)

  /* A stroke straddles the path, so half of it falls outside the path's bounds. A cropped viewBox has to grow by that much or the stroke is clipped at the edges of the svg. */
  const overhang = weight / 2
  const { d, bounds } = FILLED[direction]
  const viewBox = isStroked
    ? `0 0 ${width} ${height}`
    : stretch
      ? `${bounds.x - overhang} ${bounds.y - overhang} ${bounds.width + weight} ${bounds.height + weight}`
      : '0 0 48 48'

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio={!isStroked && stretch ? 'none' : undefined}
      height={`${height}px`}
      width={`${width}px`}
      style={additonalStyle}
      {...(onClickHandle ? fastClick(onClickHandle, { enableHaptics: false }) : null)}
      className={css({ cursor: 'pointer' }, cssRaw)}
    >
      <path
        d={isStroked ? strokedPath(direction, width, height, weight) : d}
        fill={isStroked ? 'none' : color}
        stroke={isStroked || weight ? color : undefined}
        strokeWidth={weight || undefined}
        strokeLinecap={isRounded ? 'round' : 'butt'}
        strokeLinejoin={isRounded ? 'round' : 'miter'}
      />
      {!isStroked && <path d='M0-.75h48v48h-48z' fill='none' />}
    </svg>
  )
}

export default ChevronImg
