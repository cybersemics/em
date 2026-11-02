import React from 'react'

interface IconType {
  /** Class name for style overrides. Generate it at the call site with `css({ … })`, which PandaCSS extracts statically. */
  className?: string
  fill?: string
  height?: number
  size?: number
  style?: React.CSSProperties
  width?: number
  animated?: boolean
  animationComplete?: () => void
}

export default IconType
