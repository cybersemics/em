import React from 'react'

// renders a given number as a superscript
const StaticSuperscript = ({ n }) => {
  return <span className='superscript-container'>
    <span className='num-contexts'>
      <sup>{n}</sup>
    </span>
  </span>
}

export default StaticSuperscript
