import React from 'react'

/** Renders a given number as a superscript. */
const StaticSuperscript = React.memo(({ n, style }: { n: number; style?: React.CSSProperties }) => (
  <span className='superscript-container' style={style}>
    <span className='num-contexts'>
      <sup role='superscript'>{n}</sup>
    </span>
  </span>
))

StaticSuperscript.displayName = 'StaticSuperscript'

export default StaticSuperscript
