import React, { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import ModalType from '../@types/Modal'
import toggleUserSetting from '../action-creators/toggleUserSetting'
import { Settings } from '../constants'
import getUserSetting from '../selectors/getUserSetting'
import { ActionButton } from './ActionButton'
import Modal from './Modal'

const labelStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', padding: '1em', margin: '-1em' }

/** A boolean setting checkbox, title, and description. */
const Setting: FC<{
  // if true, checks the checkbox if the key is false
  invert?: boolean
  settingsKey: Settings
  title: string
}> = ({ children, invert, settingsKey, title }) => {
  const value = useSelector(getUserSetting(settingsKey))
  const dispatch = useDispatch()
  return (
    <div style={{ marginBottom: '1.5em' }}>
      <label style={labelStyle}>
        <input
          type='checkbox'
          checked={invert ? !value : value}
          onChange={() => {
            dispatch(toggleUserSetting({ key: settingsKey }))
          }}
          style={{ cursor: 'pointer' }}
        ></input>{' '}
        <b>{title}</b>
      </label>
      <p style={{ marginLeft: 3, marginTop: '0.5em' }}>{children}</p>
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

        <Setting settingsKey={Settings.hideSuperscripts} title='Hide Superscripts'>
          Hides all superscripts (<sup>2</sup>) that indicate the number of contexts the thought appears in. When
          hidden, the superscript will not be visible, but the context view can still be activated and used as normal.
        </Setting>

        <Setting settingsKey={Settings.disableGestureTracing} title='Disable Gesture Tracing'>
          Disables the trace that is drawn onto the screen while making a gesture on a touch screen device.
        </Setting>
      </form>
    </Modal>
  )
}

export default ModalSettings
