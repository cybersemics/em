import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { store } from '../store'

// util
import {
  isContextViewActive,
} from '../util'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

const mapStateToProps = ({ contextViews, invalidState }, props) => ({
  showContexts: isContextViewActive(props.thoughtsResolved, { state: store.getState() }),
  invalidOption: props.isEditing && invalidState // if being edited and meta validation error has occured
})

// connect bullet to contextViews so it can re-render independent from <Subthought>
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
