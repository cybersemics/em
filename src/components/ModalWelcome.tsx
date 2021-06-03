import React, { useState } from 'react'
import * as murmurHash3 from 'murmurhash3js'
import classNames from 'classnames'
import Modal from './Modal'
import { BETA_HASH, EM_TOKEN } from '../constants'
import { ActionButton } from './ActionButton'
import { useDispatch, useSelector } from 'react-redux'
import { tutorial } from '../action-creators'
import { getAllChildren } from '../selectors'
import { State } from '../util/initialState'

const isLocalNetwork = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === 'bs-local.com' || // required for browserstack
  // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.1/8 is considered localhost for IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    ) ||
    // 193.0.0.1/8 is considered localhost for IPv4.
    window.location.hostname.startsWith('127.168.1.')
)

/** Wait for a fixed number of milliseconds. */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Validates an invite code entered by the user. */
const validateInviteCode = (code: string) =>
  murmurHash3.x64.hash128(code.substring(code.lastIndexOf('-') + 1)) === BETA_HASH

/** Shrink modal text and logos to fit container vertically. */
const onRef = (el: HTMLDivElement) => {
  if (!el) return
  const BOTTOM_MARGIN = 20
  const MIN_FONT_SIZE = 10
  const LOGO_SCALE_PX_PER_PERCENTAGE = 0.3

  const contentEl = el.querySelector('.modal-content') as HTMLElement

  if (!contentEl) return

  const logoEls = el.querySelectorAll('.logo') as NodeListOf<SVGGraphicsElement & HTMLElement & { width: number }>
  let fontSize = 100 // eslint-disable-line fp/no-let
  let width = logoEls[0] && logoEls[0].width // eslint-disable-line fp/no-let

  /** Returns true if the text overflows past the window height. */
  const overflow = () => {
    const { y, height } = contentEl.getBoundingClientRect()
    return y + height + BOTTOM_MARGIN > window.innerHeight
  }

  /** Decreases the font size of the element. */
  const shrinkFontSize = (el: HTMLElement) => el.style.fontSize = --fontSize + '%' // eslint-disable-line no-return-assign

  /** Decreases the width of the element. */
  const shrinkWidth = (el: HTMLElement) => el.style.width = (width -= LOGO_SCALE_PX_PER_PERCENTAGE) + 'px' // eslint-disable-line no-return-assign

  if (fontSize) {
    while (overflow() && fontSize >= MIN_FONT_SIZE) { // eslint-disable-line fp/no-loops, no-unmodified-loop-condition
      shrinkFontSize(contentEl)
      logoEls.forEach(shrinkWidth)
    }
  }
}

/** A modal that welcomes the user to em. */
const ModalWelcome = () => {

  const [inviteCode, setInviteCode] = useState(localStorage.inviteCode || '')
  const [loading, setLoading] = useState(false)
  const [invited, setInvited] = useState(isLocalNetwork || validateInviteCode(inviteCode))
  const [inviteTransition, setInviteTransition] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isTutorialSettingsLoaded = useSelector(
    (state: State) => getAllChildren(state, [EM_TOKEN, 'Settings', 'Tutorial']).length > 0
  )
  const dispatch = useDispatch()

  /** Submit a beta invite code. */
  const submitInviteCode = async () => {

    if (!inviteCode) {
      setError('Invite code required')
      return
    }

    setError(null)
    setLoading(true)

    await delay(1000)
    setLoading(false)

    if (!validateInviteCode(inviteCode)) {
      setError('Invalid code')
      return
    }

    localStorage.inviteCode = inviteCode

    // wait for fade animation to complete
    setInviteTransition(true)
    await delay(1000)
    setInvited(true)
    await delay(100)
    setInviteTransition(false)
  }

  /** Handle invite code change event. */
  const onInviteCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setInviteCode(e.target.value)
  }

  /** Handles KeyDown event. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submitInviteCode()
    }
  }

  /**
   * End tutorial.
   */
  const endTutorial = () => dispatch(tutorial({
    value: false
  }))

  return <div ref={onRef}>
    <Modal id='welcome' title='Welcome to em' className='popup' hideModalActions={!invited} center actions={({ complete }) => <div>
      <ActionButton key='start' title='START TUTORIAL' onClick={complete} />
      { <div key='skip' style={{ marginTop: 10, opacity: 0.5 }}><a id='skip-tutorial' onClick={isTutorialSettingsLoaded ? () => {
        endTutorial()
        complete()
      } : undefined}>This ain’t my first rodeo. Skip it.</a></div>
      }
    </div>}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: 560 }} className={classNames({
          'animate-slow': inviteTransition,
          'animate-fadeout': inviteTransition && !invited,
        })}>
          {invited
            ? <p><b>em</b> is a process-oriented writing tool for personal sensemaking.</p>
            : <div>
              <p style={{ marginBottom: 60 }}>Oh, you’re here early.</p>

              <div>

                <input type='text' placeholder='Enter an invite code' value={inviteCode} onKeyDown={onKeyDown} onChange={onInviteCodeChange} style={{
                  backgroundColor: '#333',
                  borderRadius: 999,
                  boxSizing: 'border-box',
                  color: 'white',
                  fontSize: '20px',
                  marginBottom: 20,
                  maxWidth: '100%',
                  outline: 'none',
                  padding: '1rem',
                  textAlign: 'center',
                  width: 320,
                  ...(loading || inviteTransition) && {
                    opacity: 0.5,
                  }
                }} />

                <div className='modal-actions' style={{ marginBottom: 20 }}>
                  <a onClick={submitInviteCode} className={classNames({
                    button: true,
                    disabled: loading,
                  })} style={{
                    boxSizing: 'border-box',
                    fontSize: '18px',
                    maxWidth: '100%',
                    width: 320,
                    textTransform: 'uppercase',
                    ...(loading || inviteTransition) && {
                      cursor: 'default',
                      opacity: 0.5,
                    }
                  }}>Submit</a>
                </div>

                {error && <p className='error'>{error}</p>}

              </div>

            </div>
          }
        </div>
      </div>
    </Modal>
  </div>
}

export default ModalWelcome
