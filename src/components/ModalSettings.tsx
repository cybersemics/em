import React, { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import ModalType from '../@types/Modal'
import State from '../@types/State'
import toggleUserSetting from '../action-creators/toggleUserSetting'
import { Settings } from '../constants'
import getUserSetting from '../selectors/getUserSetting'
import { ActionButton } from './ActionButton'
import Modal from './Modal'

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
    <div style={{ marginBottom: '1.5em', opacity: disabled ? 0.5 : undefined }}>
      <label style={{ cursor: disabled ? 'default' : 'pointer', userSelect: 'none', padding: '1em', margin: '-1em' }}>
        <input
          type='checkbox'
          checked={invert ? !value : value}
          onChange={() => {
            if (disabled) return
            dispatch(toggleUserSetting({ key: settingsKey }))
            if (dependee && !value) {
              dispatch(toggleUserSetting({ key: dependee, value: false }))
            }
          }}
          style={{ cursor: disabled ? undefined : 'pointer' }}
        ></input>{' '}
        <b>{title}</b>
      </label>
      <p style={{ marginLeft: 3, marginTop: '0.5em', cursor: disabled ? 'default' : undefined }}>{children}</p>
    </div>
  )
}

/** User settings modal. */
const ModalSettings = () => {
  return (
    <Modal
      id={ModalType.settings}
      title='Settings'
      className='popup'
      actions={({ close }) => (
        <div style={{ textAlign: 'center' }}>
          <ActionButton key='close' title='Close' onClick={() => close()} />
        </div>
      )}
    >
      <form>
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
            title='Disable Gesture Tracing for back/forward only'
            dependsOn={Settings.disableGestureTracing}
          >
            Do not show the gesture trace for simple back or forward gestures.
          </Setting>
        </div>
      </form>
    </Modal>
  )
}

export default ModalSettings
