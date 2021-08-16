import React from 'react'
import { Icon } from '../../@types'

/**
 * A circle Icon.
 *
 * @param size The width/height of the circle's outside square box.
 * @param fill The color filled inside the triangle; if the fill is empty, using 'none'.
 * @returns The svg for the circle.
 */
export const Circle = ({ size = 7, fill = 'none' }: Icon) => (
  <svg width={size} height={size}>
    <circle cx={size / 2} cy={size / 2} r={size / 2} fill={fill} stroke='#fcf8f8' strokeWidth='0.12' />
  </svg>
)

/**
 *
 * @param width Triangle outside box width.
 * @param height Triangle outside box height.
 * @param fill The color filled inside the triangle; if the fill is empty, using 'none'.
 * @returns The svg for the triangle.
 */
export const Triangle = ({ size, fill = 'none' }: Icon) => (
  <svg width={size && size * 0.75} height={size} viewBox='0 0 9 12' fill={fill} xmlns='http://www.w3.org/2000/svg'>
    <path
      d='M0.0600004 0.907771L8.88 6L0.0600004 11.0922L0.0600004 0.907771Z'
      fill={fill}
      stroke='#fcf8f8'
      strokeWidth='0.12'
    />
  </svg>
)
