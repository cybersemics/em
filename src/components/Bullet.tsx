import React, { MouseEvent } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { getLexeme, isContextViewActive, isPending } from '../selectors'
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
    invalid: !!props.isEditing && invalidState,
    missing: !lexeme,
    pending: isPending(state, props.context),
    showContexts: isContextViewActive(state, props.context),
  }
}

/** Connect bullet to contextViews so it can re-render independent from <Subthought>. */
const Bullet = ({
  showContexts,
  glyph,
  invalid,
  leaf,
  missing,
  onClick,
  pending,
}: BulletProps & ReturnType<typeof mapStateToProps>) => (
  <span
    className={classNames({
      bullet: true,
      // Since Parents and Lexemes are loaded from the db separately, it is common for Lexemes to be temporarily missing.
      // Therefore render in a simple gray rather than an error color.
      // There is not an easy way to distinguish between a Lexeme that is missing and one that is loading, though eventually if all pulls have completed successfully and the Lexeme is still missing we could infer it was an error.
      gray: missing,
      graypulse: pending,
      'show-contexts': showContexts,
      'invalid-option': invalid,
    })}
  >
    <span className='glyph' onClick={onClick}>
      {glyph || (showContexts ? (leaf ? '◦' : '▹') : leaf ? '•' : '▸')}
    </span>
  </span>
)

export default connect(mapStateToProps)(Bullet)
