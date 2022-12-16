import classNames from 'classnames'
import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import alert from '../action-creators/alert'
import { isTouch } from '../browser'
import { auth, tsid, usePermissions } from '../data-providers/yjs'
import themeColors from '../selectors/themeColors'
import { ActionButton } from './ActionButton'
import Modal from './Modal'
import CopyClipboard from './icons/CopyClipboard'
import ShareIcon from './icons/ShareIcon'

/** Permissions role label. */
const Role = ({ role }: { role: string }) => <>{role === 'owner' ? 'Full Access' : role}</>

/** Renders a share row. */
const Share = ({ accessToken, role }: { accessToken: string; role: string }) => {
  const dispatch = useDispatch()
  const colors = useSelector(themeColors)
  const url = `${window.location.href}~/?share=${tsid}&auth=${accessToken}`

  /** Copy the share link to the clipboard. */
  const copyShareUrl = () => {
    navigator.clipboard.writeText(url)
    dispatch(alert('Share URL copied to clipboard', { clearDelay: 2000 }))
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignSelf: 'start',
        margin: '3vh auto',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'inline-flex' }}>
        <span style={{ padding: '0.75em 1em 0.75em 0' }}>
          <span style={{ fontWeight: 'bold', marginRight: '1em' }}>Untitled</span>
          <Role role={role} />
        </span>{' '}
        <span style={{ position: 'relative' }}>
          <input
            type='text'
            value={url}
            readOnly={true}
            style={{ margin: '0 10px', padding: '0.75em 3em 0.75em 1em', minWidth: isTouch ? 0 : '20em' }}
          />
          <span
            onClick={copyShareUrl}
            style={{
              position: 'absolute',
              top: '0.75em',
              right: '1.25em',
              cursor: 'pointer',
            }}
          >
            {isTouch ? <ShareIcon size={22} /> : <CopyClipboard size={22} />}
          </span>
        </span>
      </div>
      <a
        style={{
          color: colors.fg,
          fontSize: '1.5em',
          paddingRight: '0.25em',
          paddingLeft: '0.25em',
          marginLeft: '0.25em',
          marginRight: '-1em',
          textDecoration: 'none',
        }}
      >
        ✕
      </a>
    </div>
  )
}

/** Modal to get gift codes. */
const ModalShare = () => {
  const colors = useSelector(themeColors)
  const [showDeviceForm, setShowDeviceForm] = useState(false)
  const permissions = usePermissions()

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

        {Object.entries(permissions).map(([accessToken, role]) => (
          <Share key={accessToken} accessToken={accessToken} role={role} />
        ))}

        {showDeviceForm ? (
          <div style={{ marginTop: '1em' }}>
            <span style={{ marginRight: '1em' }}>Name: </span>
            <input
              type='text'
              value={`Device ${Object.keys(permissions).length + 1}`}
              style={{ display: 'inline', width: '10em', minWidth: '5em', marginRight: '1em' }}
            />
            <span style={{ marginRight: '1em' }}>Full Access</span>
            <a
              onClick={auth.share}
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
              Add
            </a>
            <a
              onClick={() => setShowDeviceForm(false)}
              style={{
                color: colors.gray,
                marginLeft: '1em',
              }}
            >
              Cancel
            </a>
          </div>
        ) : (
          <div style={{ marginTop: '1em' }}>
            <a
              onClick={() => setShowDeviceForm(true)}
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
        )}
      </div>
    </Modal>
  )
}

const ModalShareMemo = React.memo(ModalShare)

export default ModalShareMemo
