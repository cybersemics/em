import { Dispatch } from 'react'
import Command from '../@types/Command'
import Thunk from '../@types/Thunk'
import { homeActionCreator as home } from '../actions/home'
import HomeToolbarIcon from '../components/icons/HomeToolbarIcon'

const homeShortcut: Command = {
  id: 'home',
  label: 'Home',
  description: 'Navigate to Home.',
  keyboard: { key: 'h', meta: true, alt: true },
  multicursor: 'ignore',
  svg: HomeToolbarIcon,
  exec: (dispatch: Dispatch<Thunk>) => dispatch(home()),
}

export default homeShortcut
