import React from 'react'
import Gravatar from 'react-gravatar'
import { store } from '../store'

// selectors
import {
  attribute,
  getThoughtsRanked,
} from '../selectors'

/** An author byline to a published article. */
const Byline = ({ context }) => {

  const state = store.getState()
  // load =publish meta data
  const contextPublish = context.concat('=publish')
  const bylineChildren = getThoughtsRanked(state, contextPublish.concat('Byline'))
  const email = attribute(state, contextPublish, 'Email')

  return (email || bylineChildren.length > 0) && <div className='publish-meta'>
    {email && <Gravatar email={email} />}
    {bylineChildren.map(child =>
      <div key={child.value} className='byline'>{child.value}</div>
    )}
  </div>
}

export default Byline
