import { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { toggleUserSettingActionCreator as toggleUserSetting } from '../../actions/toggleUserSetting'
import { Settings } from '../../constants'
import getUserSetting from '../../selectors/getUserSetting'
import fastClick from '../../util/fastClick'
import { ActionButton } from './../ActionButton'
import Checkbox from './../Checkbox'
import ModalComponent from './ModalComponent'

/** A boolean setting checkbox, title, and description. */
const Setting: FC<{
  // Toggles the dependee off whenever this setting is toggled off. Use in combination with dependsOn on the dependee setting.
  dependee?: Settings
  // Disables this setting whenever the dependsOn setting is off. Use in combination with dependee on the dependsOn setting.
  dependsOn?: Settings
  // if true, checks the checkbox if the key is false
  invert?: boolean
  settingsKey: Settings
  title: string
  children?: React.ReactNode
}> = ({ children, dependee, dependsOn, invert, settingsKey, title }) => {
  const value = useSelector(getUserSetting(settingsKey))
  const disabled = useSelector(state => dependsOn && getUserSetting(state, dependsOn))
  const dispatch = useDispatch()
  return (
    <Checkbox
      checked={invert ? !value : value}
      disabled={disabled}
      title={title}
      onChange={() => {
        if (disabled) return
        dispatch(toggleUserSetting({ key: settingsKey }))
        if (dependee && !value) {
          dispatch(toggleUserSetting({ key: dependee, value: false }))
        }
      }}
    >
      {children}
    </Checkbox>
  )
}

/** User settings modal. */
const ModalSettings = () => {
  const dispatch = useDispatch()
  return (
    <ModalComponent
      id='settings'
      title='Settings'
      className='popup'
      actions={({ close }) => (
        <div style={{ textAlign: 'center' }}>
          <ActionButton key='close' title='Close' {...fastClick(() => close())} />
        </div>
      )}
    >
      <form>
        <p style={{ marginBottom: '3em', marginTop: '-1em' }}>
          <a {...fastClick(() => dispatch(showModal({ id: 'customizeToolbar' })))} className='extend-tap'>
            Customize Toolbar
          </a>{' '}
          &gt;
        </p>

        <Setting settingsKey={Settings.experienceMode} title='Training Mode' invert>
          Shows a notification each time a gesture is executed on a touch screen device. This is helpful when you are
          learning gestures and want an extra bit of feedback.
        </Setting>

        <Setting settingsKey={Settings.hideScrollZone} title='Hide Scroll Zone'>
          Hide the overlay that indicates where the scroll zone is.
        </Setting>

        <Setting settingsKey={Settings.hideSuperscripts} title='Superscripts' invert>
          Shows superscripts (<sup>2</sup>) indicating the number of contexts the thought appears in. When disabled, the
          superscript will not be visible, but the context view can still be activated and used as normal.
        </Setting>

        <Setting settingsKey={Settings.disableGestureTracing} title='Gesture Tracing' invert>
          Draw a trace onto the screen while making a gesture on a touch screen device.
        </Setting>

        <Setting settingsKey={Settings.leftHanded} title='Left Handed'>
          Moves the scroll zone to the left side of the screen and the gesture zone to the right.
        </Setting>
      </form>
    </ModalComponent>
  )
}

export default ModalSettings
