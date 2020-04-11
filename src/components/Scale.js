import React from 'react'

/** A container that scales its children by the given amount.
  @ param amount    A percentage from 0.0 to 1.0
*/
const Scale = ({ amount, children }) =>
  <div style={{
    transform: `scale(${amount})`,
    transformOrigin: '0 0',
    width: `${100 / amount}%`,
    marginBottom: `${10 * amount}vh`, // approximate to prevent body overflow
  }}>{children}</div>

export default Scale
