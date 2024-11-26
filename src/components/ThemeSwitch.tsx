import { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { settingsActionCreator as setting } from '../actions/settings'
import theme from '../selectors/theme'
import Checkbox from './Checkbox'
import { WebviewBackground } from 'webview-background';

/** A ThemeSwitch Component with a title and description. */
const ThemeSwitch: FC = () => {
  const dispatch = useDispatch()
  const light = useSelector(state => theme(state) === 'Light')

  if (light) {
    WebviewBackground.changeBackgroundColor({ color: '#ffffff' })
  } else {
    WebviewBackground.changeBackgroundColor({ color: '#000000' })
  }

  return (
    <Checkbox
      checked={light}
      title={`Toggle Theme to ${light ? 'Dark' : 'Light'}`}
      onChange={() => dispatch(setting({ key: 'Theme', value: light ? 'Dark' : 'Light' }))}
    >
      {'Switch between Light and Dark themes.'}
    </Checkbox>
  )
}

export default ThemeSwitch
