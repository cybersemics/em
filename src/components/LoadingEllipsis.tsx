import React from 'react'

/** Renders text with an animated '...'. */
const LoadingEllipsis = ({ text = 'Loading' }) =>
  <span className='loading-ellipsis'>{text}</span>

export default LoadingEllipsis
