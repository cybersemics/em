import { Dispatch } from 'react'
import Shortcut from '../@types/Shortcut'
import Thunk from '../@types/Thunk'
import { homeActionCreator as home } from '../actions/home'
import HomeToolbarIcon from '../components/icons/HomeToolbarIcon'

const homeShortcut: Shortcut = {
  id: 'home',
  label: 'Home',
  description: 'Navigate to Home.',
  keyboard: { key: 'h', meta: true, alt: true },
  svg: HomeToolbarIcon,
  exec: (dispatch: Dispatch<Thunk>) => dispatch(home()),
}

export default homeShortcut
