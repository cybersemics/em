import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { isContextViewActive, isPending, pathToThoughtsRanked } from '../selectors'
import { hashContext, pathToContext } from '../util'
import { State } from '../util/initialState'
import { Path } from '../types'

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
  thoughtsResolved: Path,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: BulletProps) => {
  const { invalidState } = state
  const context = pathToContext(pathToThoughtsRanked(state, props.thoughtsResolved))
  return {
    // only show as pending if expanded
    pending: isPending(state, context) && !!state.expanded[hashContext(context)],
    invalidOption: props.isEditing && invalidState, // if being edited and meta validation error has occured
    showContexts: isContextViewActive(state, context),
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
