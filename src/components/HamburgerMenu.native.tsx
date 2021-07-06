import React from 'react'
import { TouchableOpacity } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useDispatch } from 'react-redux'
import { toggleSidebar } from '../action-creators'

//  const tutorialLocal = localStorage['Settings/Tutorial'] !== 'Off'

/** An options menu with three little bars that looks like a hamburger. */
const HamburgerMenu = ({ fill = '#fff', size = 45 }) => {
  const dispatch = useDispatch()

  /** Icon. */
  const Icon = () => (
    <Svg x='0px' y='0px' width={size} height={size} viewBox='0 0 50 50'>
      <Path fill={fill} d='M8.667,15h30c0.552,0,1-0.447,1-1s-0.448-1-1-1h-30c-0.552,0-1,0.447-1,1S8.114,15,8.667,15z' />
      <Path fill={fill} d='M8.667,37h30c0.552,0,1-0.447,1-1s-0.448-1-1-1h-30c-0.552,0-1,0.447-1,1S8.114,37,8.667,37z' />
      <Path fill={fill} d='M8.667,26h30c0.552,0,1-0.447,1-1s-0.448-1-1-1h-30c-0.552,0-1,0.447-1,1S8.114,26,8.667,26z' />
    </Svg>
  )

  return (
    <TouchableOpacity onPress={() => dispatch(toggleSidebar({ value: true }))}>
      <Icon />
    </TouchableOpacity>
  )
}

export default HamburgerMenu
