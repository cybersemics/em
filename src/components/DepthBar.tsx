import React from 'react'
import classNames from 'classnames'
import { store } from '../store'
import { getContexts } from '../selectors'
import { parentOf, head } from '../util'
import { Context } from '../types'

// components
import Modal from './Modal'

interface DepthBarProps {
  numDescendantCharacters: number,
  showContexts?: boolean,
  thoughtsLive: Context,
}

/** A small horizontal bar that indicates how many descendants a thought has. */
const DepthBar = ({ numDescendantCharacters, showContexts, thoughtsLive }: DepthBarProps) => <span>
  {
    numDescendantCharacters >= 16 ? <Modal
      id='depthBar'
      title='The length of this bar indicates the number of thoughts in this context.'
      style={{ top: 30, marginLeft: -16 }}
      arrow='arrow arrow-up arrow-upleft'
      opaque
    >
      <p>This helps you quickly recognize contexts with greater depth as you navigate.</p>
    </Modal> : null}

  {(showContexts ? parentOf(thoughtsLive) : thoughtsLive) && numDescendantCharacters > 0 ? <span className={classNames({
    'depth-bar': true,
    'has-other-contexts': thoughtsLive.length > 1 && (getContexts(store.getState(), head(showContexts ? parentOf(thoughtsLive) : thoughtsLive)).length > 1)
  })} style={{ width: Math.log(numDescendantCharacters) + 2 }} /> : null}
</span>

export default DepthBar
