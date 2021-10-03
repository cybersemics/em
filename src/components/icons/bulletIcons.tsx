import React from 'react'
import { Icon } from '../../@types'

/**
 * A circle Icon.
 *
 * @param size The width/height of the circle's outside square box.
 * @param fill The color filled inside the triangle; if the fill is empty, using 'none'.
 * @returns The svg for the circle.
 * On Safari, the svg width and height have to be slightly larger than the dot diameter, otherwise edge of the dot will be cutoff.
 */
export const Circle = ({ size = 8, fill = 'none' }: Icon) => (
  <svg width={size} height={size}>
    <circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={fill} stroke='#fcf8f8' strokeWidth='0.12' />
  </svg>
)

/**
 *
 * @param width Triangle outside box width.
 * @param height Triangle outside box height.
 * @param fill The color filled inside the triangle; if the fill is empty, using 'none'.
 * @returns The svg for the triangle.
 */
export const Triangle = ({ size = 12, fill = 'none' }: Icon) => (
  <svg width={size} height={size} viewBox='0 0 12 12' fill={fill}>
    <polygon points='4,0 4,12 10,6' fill={fill} stroke='#fcfaf8' strokeWidth='0.12' />
  </svg>
)
