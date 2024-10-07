import React from 'react'
import { SystemStyleObject } from '../../styled-system/types'

interface Icon {
  cssRaw?: SystemStyleObject
  fill?: string
  height?: number
  size?: number
  style?: React.CSSProperties
  width?: number
}

export default Icon
