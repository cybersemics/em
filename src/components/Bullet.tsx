import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { theme, getLexeme, isContextViewActive, isPending } from '../selectors'
import { head } from '../util'
import { Context, State, SimplePath } from '../@types'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

interface BulletProps {
  isEditing?: boolean
  leaf?: boolean
  onClick: (event: React.MouseEvent) => void
  showContexts?: boolean
  context: Context
  publish?: boolean
  simplePath: SimplePath
  hideBullet?: boolean
  isDragging?: boolean
  thoughtRef?: React.RefObject<HTMLDivElement>
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: BulletProps) => {
  const { invalidState } = state
  const lexeme = getLexeme(state, head(props.context))
  return {
    // if being edited and meta validation error has occured
    invalid: !!props.isEditing && invalidState,
    missing: !lexeme,
    fontSize: state.fontSize,
    pending: isPending(state, props.context),
    showContexts: isContextViewActive(state, props.context),
    dark: theme(state) !== 'Light',
  }
}

/** Connect bullet to contextViews so it can re-render independent from <Subthought>. */
const Bullet = ({
  showContexts,
  invalid,
  leaf,
  missing,
  onClick,
  pending,
  simplePath,
  publish,
  hideBullet,
  isDragging,
  dark,
  thoughtRef,
  fontSize,
}: BulletProps & ReturnType<typeof mapStateToProps>) => {
  const isRoot = simplePath.length === 1
  const isRootChildLeaf = simplePath.length === 2 && leaf

  const { height: thoughtHeight } = thoughtRef?.current?.getBoundingClientRect() || {}
  const svgSizeStyle = thoughtHeight
    ? {
        height: thoughtHeight,
        width: thoughtHeight,
        marginLeft: -thoughtHeight,
        // Required to make the distance between bullet and thought scale properly at all font sizes.
        left: (190 / 600) * thoughtHeight,
      }
    : {}

  // Calculate position of thought for different font sizes
  const bulletMarginLeft = -20 + (9 + 0.5 * (fontSize - 9))

  const foregroundShapeProps = showContexts
    ? {
        strokeWidth: '30',
        stroke: dark ? '#d9d9d9' : '#000',
        fill: 'none',
      }
    : {
        stroke: 'none',
        fill: dark ? '#d9d9d9' : '#000',
      }

  const foregroundShape = leaf ? (
    <ellipse className='glyph-fg' ry='92' rx='92' cy='298' cx='297' {...foregroundShapeProps} />
  ) : (
    <path
      className='glyph-fg'
      d='M260.8529375873694,149.42646091838702 L260.8529375873694,450.5735238982077 L409.1470616167427,297.55825763741126 L260.8529375873694,149.42646091838702 z'
      {...foregroundShapeProps}
    />
  )

  return (
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
      style={{
        marginLeft: bulletMarginLeft,
      }}
    >
      <svg
        className={classNames('glyph', {
          'glyph-highlighted': isDragging,
        })}
        viewBox='0 0 600 600'
        style={{
          ...svgSizeStyle,
          marginBottom: '-0.3em',
        }}
        onClick={onClick}
      >
        <g>
          {!(publish && (isRoot || isRootChildLeaf)) && !hideBullet && (
            <ellipse
              className='bullet-cursor-overlay'
              fillOpacity='0'
              ry='280'
              rx='280'
              cy='301'
              cx='297'
              fill={dark ? '#ffffff' : '#000'}
            />
          )}
          {foregroundShape}
        </g>
      </svg>
    </span>
  )
}

export default connect(mapStateToProps)(Bullet)
