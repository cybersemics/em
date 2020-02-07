import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import { store } from '../store.js'

// util
import {
  isContextViewActive,
} from '../util.js'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

// connect bullet to contextViews so it can re-render independent from <Subthought>
export const Bullet = connect(({ contextViews }, props) => ({
  showContexts: isContextViewActive(props.thoughtsResolved, { state: store.getState() })
}))(({ showContexts, glyph, leaf, onClick }) =>
  <span className={classNames({
    bullet: true,
    'show-contexts': showContexts
  })}>

    <span className='glyph' onClick={onClick}>{glyph || (showContexts
      ? leaf ? '◦' : '▹'
      : leaf ? '•' : '▸')
    }</span>
  </span>
)
