import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { store } from '../store.js'

// util
import {
  isContextViewActive,
} from '../util.js'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

// connect bullet to contextViews so it can re-render independent from <Subthought>
export default connect(({ contextViews, invalidState }, props) => ({
  showContexts: isContextViewActive(props.thoughtsResolved, { state: store.getState() }),
  invalidOption: props.isEditing && invalidState // if being edited and meta validation error has occured
}))(({ showContexts, glyph, leaf, onClick, invalidOption }) =>
  <span className={classNames({
    bullet: true,
    'show-contexts': showContexts,
    'invalid-option': invalidOption
  })}>

    <span className='glyph' onClick={onClick}>{glyph || (showContexts
      ? leaf ? '◦' : '▹'
      : leaf ? '•' : '▸')
    }</span>
  </span>
)
