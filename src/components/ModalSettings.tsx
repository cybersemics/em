import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import ModalType from '../@types/Modal'
import State from '../@types/State'
import toggleAttribute from '../action-creators/toggleAttribute'
import { EM_TOKEN } from '../constants'
import findDescendant from '../selectors/findDescendant'
import { ActionButton } from './ActionButton'
import Modal from './Modal'

const labelStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', padding: '1em', margin: '-1em' }

/** Returns the boolean value of a setting stored in /EM/Settings. */
const useBooleanSetting = (key: string) =>
  useSelector((state: State) => !!findDescendant(state, EM_TOKEN, ['Settings', key]))

/** Toggles a setting in /EM/Settings. */
const useToggleSetting = (key: string) => {
  const dispatch = useDispatch()
  return () => dispatch(toggleAttribute({ path: [EM_TOKEN], values: ['Settings', key] }))
}

/** A boolean setting checkbox, title, and description. */
const Setting = ({ invert, settingKey, title, children }: any) => {
  const value = useBooleanSetting(settingKey)
  return (
    <>
      <label style={labelStyle}>
        <input
          type='checkbox'
          checked={invert ? !value : value}
          onChange={useToggleSetting(settingKey)}
          style={{ cursor: 'pointer' }}
        ></input>{' '}
        <b>{title}</b>
      </label>
      <p style={{ marginTop: 5 }}>{children}</p>
    </>
  )
}

/** User settings modal. */
const ModalSettings = () => {
  return (
    <Modal
      id={ModalType.settings}
      title='Settings'
      className='popup'
      actions={({ close }) => <ActionButton key='close' title='Close' onClick={() => close()} />}
    >
      <form>
        <Setting settingKey='experienceMode' title={'Training Mode'} invert={true}>
          Shows a notification each time a gesture is executed. This is helpful when you are learning gestures and want
          an extra bit of feedback.
        </Setting>

        <Setting settingKey='hideSuperscripts' title={'Hide Superscripts'}>
          Hides all superscripts (<sup>2</sup>) that indicate the number of contexts the thought appears in. When
          hidden, the superscript will not be visible, but the context view can still be activated and used as normal.
        </Setting>

        <Setting settingKey='disableGestureTracing' title={'Disable Gesture Tracing'}>
          Disables the trace that is drawn onto the screen while executing a gesture.
        </Setting>
      </form>
    </Modal>
  )
}

export default ModalSettings
