import React from 'react'
import Gravatar from 'react-gravatar'
import { store } from '../store'
import { attribute, getChildrenRanked } from '../selectors'
import { Context } from '../types'

/** An author byline to a published article. */
const Byline = ({ context }: { context: Context }) => {

  const state = store.getState()
  // load =publish meta data
  const contextPublish = context.concat('=publish')
  const bylineChildren = getChildrenRanked(state, contextPublish.concat('Byline'))
  const email = attribute(state, contextPublish, 'Email')

  return email || bylineChildren.length > 0 ? <div className='publish-meta'>
    {email && <Gravatar email={email} />}
    {bylineChildren.map(child =>
      <div key={child.value} className='byline'>{child.value}</div>
    )}
  </div> : null
}

export default Byline
