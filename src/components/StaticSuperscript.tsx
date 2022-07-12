import React from 'react'

/** Renders a given number as a superscript. */
const StaticSuperscript = ({ n, style }: { n: number; style?: React.CSSProperties }) => (
  <span className='superscript-container' style={style}>
    <span className='num-contexts'>
      <sup>{n}</sup>
    </span>
  </span>
)

export default StaticSuperscript
