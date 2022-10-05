import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import State from '../@types/State'
import toggleAttribute from '../action-creators/toggleAttribute'
import { EM_TOKEN } from '../constants'
import findDescendant from '../selectors/findDescendant'
import { ActionButton } from './ActionButton'
import Modal from './Modal'

/** User settings modal. */
const ModalSettings = () => {
  const hideSuperscripts = useSelector(
    (state: State) => !!findDescendant(state, EM_TOKEN, ['Settings', 'hideSuperscripts']),
  )
  const dispatch = useDispatch()

  /** Refreshes the page without using cache. */
  const refresh = () => {
    window.location = window.location // eslint-disable-line no-self-assign
  }

  return (
    <Modal
      id='settings'
      title='Settings'
      className='popup'
      actions={({ close }) => <ActionButton key='close' title='Close' onClick={() => close()} />}
    >
      <form>
        <label style={{ cursor: 'pointer', userSelect: 'none' }}>
          <input
            type='checkbox'
            checked={hideSuperscripts}
            onChange={e => {
              // Note: never preventDefault on a controlled checkbox in React.
              // See: https://stackoverflow.com/a/70030088/4806080
              dispatch(toggleAttribute({ path: [EM_TOKEN], values: ['Settings', 'hideSuperscripts'] }))
            }}
            style={{ cursor: 'pointer' }}
          ></input>{' '}
          <b>Hide superscripts</b>
          <p style={{ marginTop: 5 }}>
            Hides all superscripts (<sup>2</sup>) that indicate the number of contexts the thought appears in. When
            hidden, the superscript will not be visible, but the context view can still be activated and used as normal.
          </p>
        </label>
      </form>

      <br />

      <p>
        <a tabIndex={-1} onClick={refresh}>
          Refresh App
        </a>
      </p>
    </Modal>
  )
}

export default ModalSettings
