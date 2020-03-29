import React from 'react'

// renders a given number as a superscript
export const StaticSuperscript = ({ n }) => {
  return <span className='superscript-container'>
    <span className='num-contexts'>
      <sup>{n}</sup>
    </span>
  </span>
}
