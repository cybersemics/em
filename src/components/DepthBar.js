import React from 'react'
import classNames from 'classnames'
import { store } from '../store'

// components
import Modal from './Modal'

// util
import {
  contextOf,
  getContexts,
  head,
} from '../util'

// selectors
import { getContexts } from '../selectors'

const DepthBar = ({ numDescendantCharacters, showContexts, thoughtsLive }) => <span>
  {numDescendantCharacters >= 16 ? <Modal id='depthBar' title="The length of this bar indicates the number of thoughts in this context." style={{ top: 30, marginLeft: -16 }} arrow='arrow arrow-up arrow-upleft' opaque>
    <p>This helps you quickly recognize contexts with greater depth as you navigate.</p>
  </Modal> : null}

  {(showContexts ? contextOf(thoughtsLive) : thoughtsLive) && numDescendantCharacters ? <span className={classNames({
    'depth-bar': true,
    'has-other-contexts': thoughtsLive.length > 1 && (getContexts(store.getState(), head(showContexts ? contextOf(thoughtsLive) : thoughtsLive)).length > 1)
  })} style={{ width: Math.log(numDescendantCharacters) + 2 }} /> : null}
</span>

export default DepthBar
