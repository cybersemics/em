import IconType from '../../@types/Icon'

/** Text Color Icon Component. */
const Icon = ({ size = 20, style }: IconType) => {
  size = style?.height ? +style.height : size
  return (
    <span className='icon' style={{ display: 'inline-block' }}>
      <span
        style={{
          border: `solid 1px ${style?.fill || style?.color}`,
          borderRadius: 5,
          display: 'inline-block',
          marginTop: size / 10 - 1,
          marginLeft: 2,
          marginRight: 2,
          color: style?.fill,
          textAlign: 'center',
          ...style,
          width: size * 0.8,
          height: size * 0.8,
        }}
      >
        <span style={{ fontSize: size * 0.65, verticalAlign: 'top', position: 'relative', top: 1 }}>A</span>
      </span>
    </span>
  )
}

export default Icon
