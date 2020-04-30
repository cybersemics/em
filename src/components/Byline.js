import React from 'react'
import Gravatar from 'react-gravatar'

import {
  attribute,
  getThoughtsRanked,
} from '../util'

/** An author byline to a published article */
const Byline = ({ context }) => {

  // load =publish meta data
  const contextPublish = context.concat('=publish')
  const bylineChildren = getThoughtsRanked(contextPublish.concat('Byline'))
  const email = attribute(contextPublish, 'Email')

  return (email || bylineChildren.length > 0) && <div className='publish-meta'>
    {email && <Gravatar email={email} />}
    {bylineChildren.map(child =>
      <div key={child.value} className='byline'>{child.value}</div>
    )}
  </div>
}

export default Byline
