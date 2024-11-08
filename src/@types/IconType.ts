import React from 'react'
import { SystemStyleObject } from '../../styled-system/types'

interface IconType {
  cssRaw?: SystemStyleObject
  fill?: string
  height?: number
  size?: number
  style?: React.CSSProperties
  width?: number
  animated?: boolean
  animationComplete?: () => void
}

export default IconType
