import React, { MouseEvent } from 'react'
import { connect } from 'react-redux'
import { getLexeme, hasChildren, isContextViewActive, isPending } from '../../selectors'
import { head } from '../../util'
import { Context, State } from '../../@types'
import { BulletWrapper, GlyphWrapper } from './styles'

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
    // re-render when leaf status changes
    isLeaf: !hasChildren(state, props.context),
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
  isLeaf,
  missing,
  onClick,
  pending,
}: BulletProps & ReturnType<typeof mapStateToProps>) => (
  <BulletWrapper
    data-showContexts={showContexts}
    gray={missing}
    grayPulse={pending}
    showContexts={showContexts}
    invalid={invalid}
  >
    <GlyphWrapper className='glyph' onClick={onClick}>
      {glyph || (showContexts ? (isLeaf ? '◦' : '▹') : isLeaf ? '•' : '▸')}
    </GlyphWrapper>
  </BulletWrapper>
)

export default connect(mapStateToProps)(Bullet)
