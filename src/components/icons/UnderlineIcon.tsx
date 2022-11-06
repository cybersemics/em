import React from 'react'
import Icon from '../../@types/Icon'

// eslint-disable-next-line jsdoc/require-jsdoc
const UnderlineIcon = ({ size = 20, style }: Icon) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    className='icon'
    version='1.1'
    width={size}
    height={size}
    x='0'
    y='0'
    viewBox='0 0 416 416'
    style={{ ...style }}
  >
    <path d='m0 394.667969h362.667969v21.332031h-362.667969zm0 0'></path>
    <path d='m181.332031 362.667969c-82.398437 0-149.332031-66.933594-149.332031-149.335938v-213.332031h21.332031v213.332031c0 70.535157 57.46875 128 128 128 70.535157 0 128-57.464843 128-128v-213.332031h21.335938v213.332031c0 82.402344-66.933594 149.335938-149.335938 149.335938zm0 0'></path>
  </svg>
)

export default UnderlineIcon
