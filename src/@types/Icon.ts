import React, { ReactNode } from 'react'
import { SystemStyleObject } from '../../styled-system/types'

interface IconType {
  cssRaw?: SystemStyleObject
  fill?: string
  height?: number
  size?: number
  style?: React.CSSProperties
  width?: number
  animated?: boolean
}

export interface AnimatedIconType {
  cssRaw?: SystemStyleObject
  fill?: string
  height?: number
  size?: number
  style?: React.CSSProperties
  width?: number
  animated?: boolean
  animationData?: object
  children?: ReactNode
}

export default IconType
