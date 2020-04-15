import React from 'react'
import Gravatar from 'react-gravatar'

import getThoughts from '../selectors/getThoughts'
import { store } from '../store'

/** An author byline to a published article */
const Byline = ({ context }) => {

  const state = store.getState()
  // load =publish meta data
  const contextPublishMeta = context.concat(['=publish'])
  const publishMetaChildren = getThoughts(state, contextPublishMeta)
  const publishMeta = publishMetaChildren.reduce((accum, child) => {
    const firstChild = getThoughts(state, contextPublishMeta.concat(child.value))[0]
    return firstChild ? {
      ...accum,
      [child.value.toLowerCase()]: firstChild.value
    } : accum
  }, {})

  const { author, email, date } = publishMeta

  return Object.keys(publishMeta).length > 0 && <div className='publish-meta'>
    {email && <Gravatar email={email} />}
    <div className='author'>{author}</div>
    <div className='date'>{date}</div>
  </div>
}

export default Byline
