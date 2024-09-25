import { FC, PropsWithChildren, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { extendTap } from '../../../styled-system/recipes'
import { fontSizeActionCreator } from '../../actions/fontSize'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { toggleUserSettingActionCreator as toggleUserSetting } from '../../actions/toggleUserSetting'
import { DEFAULT_FONT_SIZE, MAX_FONT_SIZE, MIN_FONT_SIZE, Settings } from '../../constants'
import getUserSetting from '../../selectors/getUserSetting'
import fastClick from '../../util/fastClick'
import { ActionButton } from './../ActionButton'
import Checkbox from './../Checkbox'
import ModalComponent from './ModalComponent'

/** A boolean setting checkbox, title, and description that modifies a value in EM/Settings. */
const Setting: FC<
  PropsWithChildren<{
    // Toggles the dependee off whenever this setting is toggled off. Use in combination with dependsOn on the dependee setting.
    dependee?: Settings
    // Disables this setting whenever the dependsOn setting is off. Use in combination with dependee on the dependsOn setting.
    dependsOn?: Settings
    // if true, checks the checkbox if the key is false
    invert?: boolean
    settingsKey: Settings
    title: string
  }>
> = ({ children, dependee, dependsOn, invert, settingsKey, title }) => {
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

/** A font size control. */
const FontSize = () => {
  const dispatch = useDispatch()
  const fontSizeSelector = useSelector(state => state.fontSize)
  const [fontSize, setFontSize] = useState<number>(fontSizeSelector)
  const label =
    fontSize <= MIN_FONT_SIZE
      ? 'minimum reached'
      : fontSize >= MAX_FONT_SIZE
        ? 'maximum reached'
        : fontSize === DEFAULT_FONT_SIZE
          ? 'default'
          : null

  /** Unfocus the input when the Enter key is pressed. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  return (
    <div>
      Font Size:{' '}
      <input
        type='number'
        min={MIN_FONT_SIZE}
        max={MAX_FONT_SIZE}
        value={fontSize}
        // reset on blur if font size is out of bounds
        onBlur={() => {
          if (fontSize < MIN_FONT_SIZE || fontSize > MAX_FONT_SIZE) {
            setFontSize(fontSizeSelector)
          }
        }}
        onKeyDown={onKeyDown}
        onChange={e => {
          const inputValue = +e.target.value

          setFontSize(inputValue)
          if (inputValue < MIN_FONT_SIZE || inputValue > MAX_FONT_SIZE) return
          dispatch(fontSizeActionCreator(inputValue))
        }}
        style={{
          fontSize: fontSizeSelector,
          padding: '0.5em',
        }}
      />
      {fontSizeSelector !== DEFAULT_FONT_SIZE && (
        <a
          onClick={() => {
            dispatch(fontSizeActionCreator(DEFAULT_FONT_SIZE))
            setFontSize(DEFAULT_FONT_SIZE)
          }}
          style={{ marginLeft: '0.5em' }}
        >
          reset
        </a>
      )}
      {label ? <span className='dim'> ({label})</span> : null}
    </div>
  )
}

/** User settings modal. */
const ModalSettings = () => {
  const dispatch = useDispatch()
  return (
    <ModalComponent
      id='settings'
      title='Settings'
      actions={({ close }) => (
        <div style={{ textAlign: 'center' }}>
          <ActionButton key='close' title='Close' {...fastClick(() => close())} />
        </div>
      )}
    >
      <form>
        <p style={{ marginBottom: '3em', marginTop: '-1em' }}>
          <a {...fastClick(() => dispatch(showModal({ id: 'customizeToolbar' })))} className={extendTap()}>
            Customize Toolbar
          </a>{' '}
          &gt;
        </p>

        <div style={{ marginBottom: '2em' }}>
          <FontSize />
        </div>

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
