import React, { MouseEvent } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { hasChildren, isContextViewActive, isPending } from '../selectors'
import { State } from '../util/initialState'
import { Context } from '../types'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

interface BulletProps {
  glyph?: string | null,
  isEditing?: boolean,
  leaf?: boolean,
  onClick: (event: React.MouseEvent) => void,
  showContexts?: boolean,
  context: Context,
}

interface MapStateToProps {
  invalidOption: boolean,
  isLeaf: boolean,
  pending: boolean,
  showContexts: boolean,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: BulletProps) => {
  const { invalidState } = state
  return {
    // if being edited and meta validation error has occured
    invalidOption: !!props.isEditing && invalidState,
    // re-render when leaf status changes
    isLeaf: !hasChildren(state, props.context),
    pending: isPending(state, props.context),
    showContexts: isContextViewActive(state, props.context),
  }
}

/** Connect bullet to contextViews so it can re-render independent from <Subthought>. */
const Bullet = ({ showContexts, glyph, isLeaf, onClick, invalidOption, pending }: BulletProps & MapStateToProps) =>
  <span className={classNames({
    bullet: true,
    graypulse: pending,
    'show-contexts': showContexts,
    'invalid-option': invalidOption
  })}>

    <span className='glyph' onClick={onClick}>{glyph || (showContexts
      ? isLeaf ? '◦' : '▹'
      : isLeaf ? '•' : '▸')
    }</span>
  </span>

export default connect(mapStateToProps)(Bullet)
