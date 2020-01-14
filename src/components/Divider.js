import React from 'react'
import classNames from 'classnames'

import {
  hashContext,
  headRank
} from '../util.js'

export const Divider = ({ thoughtsRanked }) => <div className='divider-container'>
  <div className={classNames({
    divider: true,
    // requires editable-hash className to be selected by the cursor navigation via editableNode
    ['editable-' + hashContext(thoughtsRanked, headRank(thoughtsRanked))]: true,
  })} />
</div>
