import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { isContextViewActive, isPending } from '../selectors'
import { pathToContext } from '../util'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state, props) => {
  const { invalidState } = state
  return {
    pending: isPending(state, pathToContext(props.thoughtsResolved)),
    invalidOption: props.isEditing && invalidState, // if being edited and meta validation error has occured
    showContexts: isContextViewActive(state, props.thoughtsResolved),
  }
}

/** Connect bullet to contextViews so it can re-render independent from <Subthought>. */
const Bullet = ({ showContexts, glyph, leaf, onClick, pending, invalidOption }) =>
  <span className={classNames({
    bullet: true,
    graypulse: pending,
    'show-contexts': showContexts,
    'invalid-option': invalidOption
  })}>

    <span className='glyph' onClick={onClick}>{glyph || (showContexts
      ? leaf ? '◦' : '▹'
      : leaf ? '•' : '▸')
    }</span>
  </span>

export default connect(mapStateToProps)(Bullet)
