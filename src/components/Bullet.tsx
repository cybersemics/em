import React, { MouseEvent } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { getLexeme, hasChildren, isContextViewActive, isPending } from '../selectors'
import { head, equalPath } from '../util'
import { Circle, Triangle } from './icons/bulletIcons'
import { Context, SimplePath, State } from '../@types'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

interface BulletProps {
  glyph?: string | null
  isEditing?: boolean
  leaf?: boolean
  onClick: (event: React.MouseEvent) => void
  showContexts?: boolean
  context: Context
  isDragging?: boolean
  simplePath: SimplePath
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: BulletProps) => {
  const { invalidState, draggedSimplePath, dragHold } = state
  const { simplePath, isDragging } = props
  const lexeme = getLexeme(state, head(props.context))
  return {
    // if being edited and meta validation error has occured
    invalid: !!props.isEditing && invalidState,
    // re-render when leaf status changes
    isLeaf: !hasChildren(state, props.context),
    missing: !lexeme,
    pending: isPending(state, props.context),
    showContexts: isContextViewActive(state, props.context),
    isDragging: isDragging || (dragHold && equalPath(draggedSimplePath!, simplePath)),
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
  isDragging,
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
      'bullet-highlighted': isDragging,
    })}
  >
    <span className='glyph' onClick={onClick}>
      { // The shape of text '•' and '▸' is a rectangle. The triangles/dots are not centered vertically inside the rectangle on all browsers. Hence, we replace them with svg.
        glyph ||
        (showContexts ? (
          isLeaf ? (
            <Circle />
          ) : (
            <Triangle />
          )
        ) : isLeaf ? (
          <Circle fill='#C4C4C4' />
        ) : (
          <Triangle fill='#C4C4C4' />
        ))}
    </span>
  </span>
)

export default connect(mapStateToProps)(Bullet)
