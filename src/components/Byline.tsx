import Gravatar from 'react-gravatar'
import ThoughtId from '../@types/ThoughtId'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'
import store from '../stores/app'

/** An author byline to a published article. */
const Byline = ({ id }: { id: ThoughtId }) => {
  const state = store.getState()
  // load =publish meta data
  const publishId = findDescendant(state, id, '=publish')
  const bylineId = publishId ? findDescendant(state, publishId, 'Byline') : null
  const bylineChildren = bylineId ? getChildrenRanked(state, bylineId) : []
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
