import React from 'react'
import Gravatar from 'react-gravatar'

import getThoughts from '../selectors/getThoughts'
import { store } from '../store'

/** An author byline to a published article */
const Byline = ({ context }) => {

  const state = store.getState()
  // load article meta data
  const contextArticleMeta = context.concat(['=publish'])
  const articleMetaChildren = getThoughts(state, contextArticleMeta)
  const articleMeta = articleMetaChildren.reduce((accum, child) => {
    const firstChild = getThoughts(state, contextArticleMeta.concat(child.value))[0]
    return firstChild ? {
      ...accum,
      [child.value.toLowerCase()]: firstChild.value
    } : accum
  }, {})

  const { author, email, date } = articleMeta

  return Object.keys(articleMeta).length > 0 && <div className='publish-meta'>
    {email && <Gravatar email={email} />}
    <div className='author'>{author}</div>
    <div className='date'>{date}</div>
  </div>
}

export default Byline
