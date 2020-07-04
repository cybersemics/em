import React from 'react'

/** Renders a given number as a superscript. */
const StaticSuperscript = ({ n }: { n: number }) => {
  return <span className='superscript-container'>
    <span className='num-contexts'>
      <sup>{n}</sup>
    </span>
  </span>
}

export default StaticSuperscript
