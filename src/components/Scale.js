import React from 'react'

import { publishMode } from '../util'

/** A container that scales its children by the given amount.
  @ param amount    A percentage from 0.0 to 1.0
*/
const Scale = ({ amount, children }) =>
  // temporarily disable scale in publish mode until #536 is fixed
  <div style={{
    transform: `scale(${!publishMode() ? amount : 1})`,
    transformOrigin: '0 0',
    width: `${100 * (1 / (!publishMode() ? amount : 1))}%`
  }}>{children}</div>

export default Scale
