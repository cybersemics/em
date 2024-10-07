import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import IconType from '../../@types/Icon'

/** Text Color Icon Component. */
const Icon = ({ size = 20, style, cssRaw }: IconType) => {
  size = style?.height ? +style.height : size
  return (
    <span className={cx(icon(), css({ display: 'inline-block' }))}>
      <span
        className={cx(
          css(
            {
              borderRadius: 5,
              display: 'inline-block',
              marginLeft: 2,
              marginRight: 2,
              textAlign: 'center',
            },
            cssRaw,
          ),
        )}
        style={{
          border: `solid 1px ${style?.fill || style?.color},`,
          marginTop: size / 10 - 1,
          color: style?.fill,
          ...style,
          width: size * 0.8,
          height: size * 0.8,
        }}
      >
        <span
          className={css({ verticalAlign: 'top', position: 'relative', top: '1px' })}
          style={{ fontSize: size * 0.65 }}
        >
          A
        </span>
      </span>
    </span>
  )
}

export default Icon
