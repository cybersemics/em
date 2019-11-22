import React from 'react'
import * as classNames from 'classnames'

// components
import { Helper } from './Helper.js'

// util
import {
  getContexts,
  intersections,
  signifier,
} from '../util.js'

export const DepthBar = ({ numDescendantCharacters, showContexts, itemsLive }) => <span>
  {numDescendantCharacters >= 16 ? <Helper id='depthBar' title="The length of this bar indicates the number of items in this context." style={{ top: 30, marginLeft: -16 }} arrow='arrow arrow-up arrow-upleft' opaque>
    <p>This helps you quickly recognize contexts with greater depth as you navigate.</p>
  </Helper> : null}

  {(showContexts ? intersections(itemsLive) : itemsLive) && numDescendantCharacters ? <span className={classNames({
    'depth-bar': true,
    'has-other-contexts': itemsLive.length > 1 && (getContexts(signifier(showContexts ? intersections(itemsLive) : itemsLive)).length > 1)
  })} style={{ width: Math.log(numDescendantCharacters) + 2 }} /> : null}
</span>
