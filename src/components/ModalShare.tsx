import classNames from 'classnames'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import alert from '../action-creators/alert'
import { auth } from '../data-providers/yjs'
import themeColors from '../selectors/themeColors'
import { ActionButton } from './ActionButton'
import Modal from './Modal'
import CopyClipboard from './icons/CopyClipboard'
import InvitesIcon from './icons/InvitesIcon'

/** Modal to get gift codes. */
const ModalShare = () => {
  const dispatch = useDispatch()
  const colors = useSelector(themeColors)

  /** Copy text to clipboard. */
  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    dispatch(alert('URL copied to clipboard', { clearDelay: 2000 }))
  }

  const shares: any[] = []

  return (
    <Modal
      id='share'
      title='Sharing & Device Management'
      className='popup'
      center
      actions={({ close }) => <ActionButton key='close' title='Close' onClick={() => close()} />}
    >
      <div className='modal-wrapper'>
        <p className='modal-description'>
          Share your thoughtspace or add a device. Thoughts will be synced in realtime.
        </p>

        {shares.map(({ id }) => {
          return (
            <div key={id} className='gift-code-wrapper'>
              <div style={{ display: 'inline-flex' }}>
                <InvitesIcon size={26} />
              </div>
              <div className='copy-icon-wrapper' onClick={() => copy('')}>
                <CopyClipboard size={26} />
              </div>
            </div>
          )
        })}

        <div>
          <a
            onClick={() => {
              auth.share()
            }}
            className={classNames({
              button: true,
              'button-outline': true,
            })}
            style={{
              border: `solid 1px ${colors.fg}`,
              color: colors.fg,
              backgroundColor: colors.bg,
              display: 'inline-block',
            }}
          >
            + Add a device
          </a>
        </div>
      </div>
    </Modal>
  )
}

const ModalShareMemo = React.memo(ModalShare)

export default ModalShareMemo
