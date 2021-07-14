import React, { MouseEvent } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { getLexeme, hasChildren, isContextViewActive, isPending } from '../selectors'
import { head } from '../util'
import { Context, State } from '../@types'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

interface BulletProps {
  glyph?: string | null
  isEditing?: boolean
  leaf?: boolean
  onClick: (event: React.MouseEvent) => void
  showContexts?: boolean
  context: Context
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: BulletProps) => {
  const { invalidState } = state
  const lexeme = getLexeme(state, head(props.context))
  return {
    // if being edited and meta validation error has occured
    invalid: !lexeme || (!!props.isEditing && invalidState),
    // re-render when leaf status changes
    isLeaf: !hasChildren(state, props.context),
    pending: isPending(state, props.context),
    showContexts: isContextViewActive(state, props.context),
  }
}

/** Connect bullet to contextViews so it can re-render independent from <Subthought>. */
const Bullet = ({
  showContexts,
  glyph,
  isLeaf,
  onClick,
  invalid,
  pending,
}: BulletProps & ReturnType<typeof mapStateToProps>) => (
  <span
    className={classNames({
      bullet: true,
      graypulse: pending,
      'show-contexts': showContexts,
      'invalid-option': invalid,
    })}
  >
    <span className='glyph' onClick={onClick}>
      {glyph || (showContexts ? (isLeaf ? '◦' : '▹') : isLeaf ? '•' : '▸')}
    </span>
  </span>
)

export default connect(mapStateToProps)(Bullet)
