import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { isContextViewActive, isPending } from '../selectors'
import { hashContext } from '../util'
import { State } from '../util/initialState'
import { Context } from '../types'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

interface BulletProps {
  glyph?: string | null,
  invalidOption?: boolean,
  isEditing?: boolean,
  leaf?: boolean,
  onClick: any,
  pending?: boolean,
  showContexts?: boolean,
  context: Context,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: BulletProps) => {
  const { invalidState } = state
  return {
    // only show as pending if expanded
    pending: isPending(state, props.context) && !!state.expanded[hashContext(props.context)],
    invalidOption: props.isEditing && invalidState, // if being edited and meta validation error has occured
    showContexts: isContextViewActive(state, props.context),
  }
}

/** Connect bullet to contextViews so it can re-render independent from <Subthought>. */
const Bullet = ({ showContexts, glyph, leaf, onClick, invalidOption, pending }: BulletProps) =>
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
