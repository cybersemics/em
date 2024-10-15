import { FC, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { settingsActionCreator as setting } from '../actions/settings'
import theme from '../selectors/theme'

/** A ThemeSwitch Component with a title and description. */
const ThemeSwitch: FC = () => {
  const dispatch = useDispatch()
  const currentTheme = useSelector(state => theme(state))
  const [active, setActive] = useState(currentTheme === 'Light')

  useEffect(() => {
    setActive(currentTheme === 'Light')
  }, [currentTheme])

  /** Toggle the theme depending on the current theme. */
  const toggleTheme = () => {
    const newTheme = active ? 'Dark' : 'Light'
    dispatch(setting({ key: 'Theme', value: newTheme }))
    setActive(!active)
  }

  return (
    <div className='container--toggle'>
      <input
        role='switch'
        type='checkbox'
        id='toggle'
        className='toggle--checkbox'
        onChange={toggleTheme}
        checked={active}
        readOnly
      />
      <label htmlFor='toggle' className='toggle--label'>
        <span className='toggle--label-background' />
      </label>
    </div>
  )
}

export default ThemeSwitch
