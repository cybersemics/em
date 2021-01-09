import React from 'react'

/** Content component fallback during lazy loading. */
const ContentFallback = () =>
  <div id='content-wrapper'>
    <div id='content' className='content' />
  </div>

export default ContentFallback
