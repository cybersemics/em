import React, { useState, useRef, useEffect } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { getLexeme, isContextViewActive, isPending } from '../selectors'
import { head } from '../util'
import { Context, State, SimplePath } from '../@types'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

interface BulletProps {
  glyph?: string | null
  isEditing?: boolean
  leaf?: boolean
  onClick: (event: React.MouseEvent) => void
  showContexts?: boolean
  context: Context
  publish?: boolean
  simplePath: SimplePath
  hideBullet?: boolean
  isDragging?: boolean
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
    fontSize: state.fontSize,
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
  simplePath,
  publish,
  hideBullet,
  isDragging,
  fontSize,
}: BulletProps & ReturnType<typeof mapStateToProps>) => {
  const bulletRef = useRef<HTMLSpanElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [top, setTop] = useState(0)

  useEffect(() => {
    if (bulletRef.current && svgRef.current) {
      const { y: bulletYPosition } = bulletRef.current.getBoundingClientRect()
      const { y: svgYPosition } = svgRef.current.getBoundingClientRect()
      const topValue = bulletYPosition - svgYPosition
      setTop(topValue)
    }
  }, [fontSize])

  const isRoot = simplePath.length === 1
  const isRootChildLeaf = simplePath.length === 2 && leaf
  const scale = fontSize / 15

  const foregroundShapeProps = showContexts
    ? {
        strokeWidth: '30',
        stroke: '#ffffff',
        fill: 'none',
      }
    : {
        stroke: 'none',
        fill: '#ffffff',
      }

  const foregroundShape = leaf ? (
    <ellipse className='glyph-fg' ry='110' rx='110' cy='298' cx='297' {...foregroundShapeProps} />
  ) : (
    <path
      className='glyph-fg'
      d='m200,430.04381c0,23.31597 27.4603,35.7772 45.00589,20.42426l137.00193,-119.8775c17.29811,-15.13584 17.29811,-42.0469 0,-57.18273l-137.00193,-119.87576c-17.54559,-15.35294 -45.00589,-2.89235 -45.00589,20.42253l0,256.0892z'
      {...foregroundShapeProps}
    />
  )

  return (
    <span
      ref={bulletRef}
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
      <svg
        ref={svgRef}
        className={classNames('glyph', {
          'glyph-highlighted': isDragging,
        })}
        viewBox='0 0 600 600'
        style={{
          transform: `scale(${scale})`,
          top: `${top}px`,
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
              fill='#ffffff'
            />
          )}
          {foregroundShape}
        </g>
      </svg>
    </span>
  )
}

export default connect(mapStateToProps)(Bullet)
