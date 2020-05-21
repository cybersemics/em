import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'

// util
import {
  isContextViewActive,
} from '../selectors'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state, props) => {
  const { invalidState } = state
  return {
    showContexts: isContextViewActive(state, props.thoughtsResolved),
    invalidOption: props.isEditing && invalidState // if being edited and meta validation error has occured
  }
}

/** Connect bullet to contextViews so it can re-render independent from <Subthought>. */
const Bullet = ({ showContexts, glyph, leaf, onClick, invalidOption }) =>
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

export default connect(mapStateToProps)(Bullet)
