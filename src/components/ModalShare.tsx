import classNames from 'classnames'
import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Index from '../@types/IndexType'
import ShareType from '../@types/Share'
import alert from '../action-creators/alert'
import { isTouch } from '../browser'
import { accessToken as accessTokenCurrent, shareServer, tsid, usePermissions } from '../data-providers/yjs'
import themeColors from '../selectors/themeColors'
import { ActionButton } from './ActionButton'
import Modal from './Modal'
import CopyClipboard from './icons/CopyClipboard'
import ShareIcon from './icons/ShareIcon'

/** Gets the next available device name for a new device. Autoincrements by 1. */
const getNextDeviceName = (permissions: Index<ShareType>, start?: number): string => {
  const nextDeviceNumber = start ?? Object.keys(permissions).length + 1
  return Object.values(permissions).some(share => share.name === `Device ${nextDeviceNumber}`)
    ? getNextDeviceName(permissions, nextDeviceNumber + 1)
    : `Device ${nextDeviceNumber}`
}

/** Permissions role label. */
const Role = ({ role }: { role: string }) => <>{role === 'owner' ? 'Full Access' : role}</>

/** Renders a share row. */
const Share = ({
  accessToken,
  isCurrent,
  name,
  onDelete,
  role,
}: {
  accessToken: string
  isCurrent?: boolean
  name?: string
  onDelete?: () => void
  role: string
}) => {
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
          <span style={{ fontWeight: 'bold', marginRight: '1em' }}>{name ?? 'Untitled'}</span>
          <Role role={role} />
        </span>{' '}
        {isCurrent ? (
          <span
            style={{
              textAlign: 'left',
              fontStyle: 'italic',
              marginRight: '1em',
              margin: '0 10px',
              padding: '0.75em 0',
            }}
          >
            this device
          </span>
        ) : (
          <span style={{ position: 'relative' }}>
            <span>
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
          </span>
        )}
      </div>
      {!isCurrent && (
        <a
          onClick={onDelete}
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
      )}
    </div>
  )
}

/** The form that allows the user to add a new device. */
const AddDeviceForm = ({
  onCancel,
  onSubmit,
  defaultName,
}: {
  onCancel: () => void
  onSubmit: ({ name, role }: ShareType) => void
  defaultName?: string
}) => {
  const colors = useSelector(themeColors)
  const [name, setName] = useState(defaultName ?? 'Untitled')
  return (
    <div style={{ margin: '0 auto' }}>
      <div style={{ border: 'solid 1px', borderColor: colors.gray15, marginBottom: '3em' }} />
      <div>
        <span style={{ marginRight: '1em' }}>Name: </span>
        <input
          ref={el => el?.focus()}
          type='text'
          onChange={e => setName(e.target.value)}
          value={name}
          style={{ display: 'inline', width: '10em', minWidth: '5em', marginRight: '1em' }}
        />
      </div>

      <div>
        <span style={{ marginRight: '1em' }}>Access: </span>
        <span
          style={{
            display: 'inline-block',
            fontSize: '16px',
            marginRight: '1em',
            marginBottom: '2vh',
            minWidth: '5em',
            padding: '10px 1.75em 10px 0',
            textAlign: 'left',
            width: '10em',
          }}
        >
          Full Access
        </span>
      </div>

      <div>
        <a
          onClick={() => onSubmit({ name, role: 'owner' })}
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
          onClick={onCancel}
          style={{
            color: colors.gray,
            marginLeft: '1em',
          }}
        >
          Cancel
        </a>
      </div>
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

        {Object.entries(permissions).map(([accessToken, share]) => (
          <Share
            key={accessToken}
            accessToken={accessToken}
            isCurrent={accessToken === accessTokenCurrent}
            name={share.name}
            onDelete={() => shareServer.delete(accessToken)}
            role={share.role}
          />
        ))}

        {showDeviceForm ? (
          <AddDeviceForm
            onCancel={() => setShowDeviceForm(false)}
            onSubmit={({ name, role }: ShareType) => {
              shareServer.add({ name: name?.trim(), role })
              setShowDeviceForm(false)
            }}
            defaultName={getNextDeviceName(permissions)}
          />
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
