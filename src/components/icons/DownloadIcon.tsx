import IconType from '../../@types/Icon'

/** Download icon. */
const DownloadIcon = ({ fill, size = 20, style }: IconType) => {
  const stroke = style?.fill || fill
  return (
    <svg width={size} height={size} viewBox='65 0 390.526 540' fill={fill} className='icon' style={style}>
      <path
        d='M 281.49 17.698 L 281.49 93.079 C 281.49 104.973 291.135 114.618 303.029 114.618 L 378.41 114.618'
        fill='none'
        stroke={stroke}
        strokeMiterlimit='10'
        strokeWidth={25}
        strokeLinecap='round'
      />
      <path
        d='M 272.574 12.989 L 33.803 12.989 C 21.909 12.989 12.264 22.633 12.264 34.528 L 12.264 486.244 C 12.264 498.139 21.908 507.784 33.803 507.784 L 356.873 507.784 C 368.768 507.784 378.412 498.139 378.412 486.244 L 378.412 118.828 C 378.412 113.117 376.143 107.637 372.104 103.597 L 287.801 19.294 C 283.758 15.255 278.282 12.986 272.57 12.986 L 272.574 12.989 Z'
        fill='none'
        stroke={stroke}
        strokeMiterlimit='10'
        strokeWidth={25}
        strokeLinecap='round'
      />
      <path
        d='M 195.338 206.541 L 195.338 373.461'
        fill='none'
        stroke={stroke}
        strokeMiterlimit='10'
        strokeWidth={25}
        strokeLinecap='round'
      />
      <path
        d='M 254.352 317.031 L 195.338 376.045 L 136.324 317.031'
        fill='none'
        stroke={stroke}
        strokeMiterlimit='10'
        strokeWidth={25}
        strokeLinecap='round'
      />
    </svg>
  )
}

export default DownloadIcon
