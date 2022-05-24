import React from 'react'
import Gravatar from 'react-gravatar'
import { store } from '../store'
import { attribute, findDescendant, getChildrenRankedById } from '../selectors'
import { contextToThoughtId } from '../util'
import { Context } from '../@types'

/** An author byline to a published article. */
const Byline = ({ context }: { context: Context }) => {
  const state = store.getState()
  // load =publish meta data
  const contextPublish = context.concat('=publish')
  const publishId = contextToThoughtId(state, contextPublish)
  const bylineId = publishId ? findDescendant(state, publishId, 'Byline') : null
  const bylineChildren = bylineId ? getChildrenRankedById(state, bylineId) : []
  const email = publishId && attribute(state, publishId, 'Email')

  return email || bylineChildren.length > 0 ? (
    <div className='publish-meta'>
      {email && <Gravatar email={email} />}
      {bylineChildren.map(child => (
        <div key={child.value} className='byline'>
          {child.value}
        </div>
      ))}
    </div>
  ) : null
}

export default Byline
