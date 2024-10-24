import Gravatar from 'react-gravatar'
import { css } from '../../styled-system/css'
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
    <div className={css({ margin: '15px 0', fontSize: '85%', overflow: 'hidden', lineHeight: '1.4' })}>
      {email && (
        <Gravatar
          className={css({
            margin: '10px 10px 10px 0',
            borderRadius: '9999px',
            float: 'left',
          })}
          email={email}
        />
      )}
      {bylineChildren.map(child => (
        <div
          key={child.value}
          className={css({
            '&:first-of-type': { marginTop: '15px' },
            '&:nth-of-type(2)': { opacity: 0.6 },
          })}
        >
          {child.value}
        </div>
      ))}
    </div>
  ) : null
}

export default Byline
