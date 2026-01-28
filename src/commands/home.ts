import { Dispatch } from 'react'
import Command from '../@types/Command'
import Thunk from '../@types/Thunk'
import { homeActionCreator as home } from '../actions/home'
import HomeToolbarIcon from '../components/icons/HomeToolbarIcon'

const homeCommand = {
  id: 'home',
  label: 'Home',
  description: 'Navigate to Home.',
  keyboard: { key: 'h', meta: true, alt: true },
  multicursor: false,
  svg: HomeToolbarIcon,
  exec: (dispatch: Dispatch<Thunk>) => dispatch(home()),
} satisfies Command

export default homeCommand
