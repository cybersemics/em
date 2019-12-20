import React from 'react'
import * as classNames from 'classnames'

// components
import { Modal } from './Modal.js'

// util
import {
  getContexts,
  contextOf,
  head,
} from '../util.js'

export const DepthBar = ({ numDescendantCharacters, showContexts, thoughtsLive }) => <span>
  {numDescendantCharacters >= 16 ? <Modal id='depthBar' title="The length of this bar indicates the number of thoughts in this context." style={{ top: 30, marginLeft: -16 }} arrow='arrow arrow-up arrow-upleft' opaque>
    <p>This helps you quickly recognize contexts with greater depth as you navigate.</p>
  </Modal> : null}

  {(showContexts ? contextOf(thoughtsLive) : thoughtsLive) && numDescendantCharacters ? <span className={classNames({
    'depth-bar': true,
    'has-other-contexts': thoughtsLive.length > 1 && (getContexts(head(showContexts ? contextOf(thoughtsLive) : thoughtsLive)).length > 1)
  })} style={{ width: Math.log(numDescendantCharacters) + 2 }} /> : null}
</span>
