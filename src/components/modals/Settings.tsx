import React, { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import State from '../../@types/State'
import toggleUserSetting from '../../action-creators/toggleUserSetting'
import { Settings } from '../../constants'
import getUserSetting from '../../selectors/getUserSetting'
import themeColors from '../../selectors/themeColors'
import { ActionButton } from './../ActionButton'
import CheckboxItem from './../CheckboxItem'
import GestureDiagram from './../GestureDiagram'
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
}> = ({ children, dependee, dependsOn, invert, settingsKey, title }) => {
  const value = useSelector(getUserSetting(settingsKey))
  const disabled = useSelector((state: State) => dependsOn && getUserSetting(state, dependsOn))
  const dispatch = useDispatch()
  return (
    <CheckboxItem
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
    </CheckboxItem>
  )
}

/** User settings modal. */
const ModalSettings = () => {
  const colors = useSelector(themeColors)
  const fontSize = useSelector((state: State) => state.fontSize)
  return (
    <ModalComponent
      id='settings'
      title='Settings'
      className='popup'
      actions={({ close }) => (
        <div style={{ textAlign: 'center' }}>
          <ActionButton key='close' title='Close' onClick={() => close()} />
        </div>
      )}
    >
      <form style={{ fontSize: undefined }}>
        <Setting settingsKey={Settings.experienceMode} title='Training Mode' invert>
          Shows a notification each time a gesture is executed on a touch screen device. This is helpful when you are
          learning gestures and want an extra bit of feedback.
        </Setting>

        <Setting settingsKey={Settings.hideSuperscripts} title='Superscripts' invert>
          Shows superscripts (<sup>2</sup>) indicating the number of contexts the thought appears in. When disabled, the
          superscript will not be visible, but the context view can still be activated and used as normal.
        </Setting>

        <Setting
          settingsKey={Settings.disableGestureTracing}
          title='Gesture Tracing'
          invert
          dependee={Settings.disableGestureTracingBackForward}
        >
          Draw a trace onto the screen while making a gesture on a touch screen device.
        </Setting>

        <div style={{ marginLeft: '2em' }}>
          <Setting
            settingsKey={Settings.disableGestureTracingBackForward}
            title='Disable Gesture Tracing for back/forward'
            dependsOn={Settings.disableGestureTracing}
          >
            Do not show the gesture trace for single-swipe gestures, i.e. back
            <span style={{ whiteSpace: 'nowrap' }}>
              (
              <GestureDiagram
                path='r'
                size={fontSize * 2}
                color={colors.gray66}
                style={{ height: 9, marginLeft: '-0.2em', marginRight: '-0.9em' }}
              />
              )
            </span>{' '}
            and forward{' '}
            <span style={{ whiteSpace: 'nowrap' }}>
              (
              <GestureDiagram
                path='l'
                size={fontSize * 2}
                color={colors.gray66}
                style={{ height: 9, marginLeft: '-0.2em', marginRight: '-0.9em' }}
              />
              )
            </span>
            .
          </Setting>
        </div>
      </form>
    </ModalComponent>
  )
}

export default ModalSettings
