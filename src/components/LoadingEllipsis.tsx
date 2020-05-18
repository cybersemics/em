import React from 'react'

/** Renders text with an animated '...'. */
export default ({ text = 'Loading' }) =>
  <span className='loading-ellipsis'>{text}</span>

