import React from 'react'

interface TriangleProps {
  fill?: string,
  size?: number,
  width?: number,
  height?: number,
}

/** A right-facing triangle component. */
const TriangleRight = ({ fill = 'black', size = 20, width, height }: TriangleProps) =>
  <svg
    xmlns=''
    version='1.1'
    width={width || (height ? height / 2 : size)}
    height={height || (width ? width * 2 : size)}
    fill={fill}
    viewBox='0 0 5 10'
  >
    <polygon points='0,0 5,5 0,10' />
  </svg>

export default TriangleRight
