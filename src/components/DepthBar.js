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

export const DepthBar = ({ numDescendantCharacters, showContexts, itemsLive }) => <span>
  {numDescendantCharacters >= 16 ? <Modal id='depthBar' title="The length of this bar indicates the number of items in this context." style={{ top: 30, marginLeft: -16 }} arrow='arrow arrow-up arrow-upleft' opaque>
    <p>This helps you quickly recognize contexts with greater depth as you navigate.</p>
  </Modal> : null}

  {(showContexts ? contextOf(itemsLive) : itemsLive) && numDescendantCharacters ? <span className={classNames({
    'depth-bar': true,
    'has-other-contexts': itemsLive.length > 1 && (getContexts(head(showContexts ? contextOf(itemsLive) : itemsLive)).length > 1)
  })} style={{ width: Math.log(numDescendantCharacters) + 2 }} /> : null}
</span>
