import classNames from 'classnames'
import _ from 'lodash'
import { QRCodeSVG } from 'qrcode.react'
import React, { useCallback, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Index from '../@types/IndexType'
import ShareType from '../@types/Share'
import State from '../@types/State'
import alert from '../action-creators/alert'
import { isTouch } from '../browser'
import { accessToken as accessTokenCurrent, shareServer, tsid, usePermissions } from '../data-providers/yjs'
import themeColors from '../selectors/themeColors'
import { ActionButton } from './ActionButton'
import ContentEditable, { ContentEditableEvent } from './ContentEditable'
import Modal from './Modal'
import CopyClipboard from './icons/CopyClipboard'
import PencilIcon from './icons/PencilIcon.native'
import ShareIcon from './icons/ShareIcon'

/** Gets the next available device name for a new device. Autoincrements by 1. */
const getNextDeviceName = (permissions: Index<ShareType>, start?: number): string => {
  const nextDeviceNumber = start ?? Object.keys(permissions).length + 1
  return Object.values(permissions).some(share => share.name === `Device ${nextDeviceNumber}`)
    ? getNextDeviceName(permissions, nextDeviceNumber + 1)
    : `Device ${nextDeviceNumber}`
}

/** Modal for Sharing and Device Management. */
const ModalShare = () => {
  const permissions = usePermissions()

  // selected accessToken
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <Modal
      id='share'
      title='Sharing & Device Management'
      className='popup'
      center
      // do not show the close button on the detail view, since it renders the "Remove device" link at the very bottom of the page
      actions={({ close }) => (!selected ? <ActionButton key='close' title='Close' onClick={() => close()} /> : null)}
    >
      <div className='modal-wrapper'>
        {selected && permissions[selected] ? (
          <ShareDetail
            accessToken={selected}
            isLastDevice={Object.keys(permissions).length === 1}
            onBack={() => setSelected(null)}
            share={permissions[selected]}
          />
        ) : (
          <ShareList onAdd={setSelected} onSelect={setSelected} permissions={permissions} />
        )}
      </div>
    </Modal>
  )
}

/** The list of device shares for the thoughtspace. */
const ShareList = ({
  onAdd,
  onSelect,
  permissions,
}: {
  onAdd?: (accessToken: string) => void
  onSelect?: (accessToken: string) => void
  permissions: Index<ShareType>
}) => {
  const colors = useSelector(themeColors)
  const [showDeviceForm, setShowDeviceForm] = useState(false)

  // sort the owner to the top, then sort by name
  const permissionsSorted = _.sortBy(
    Object.entries(permissions),
    ([accessToken, share]) => `${share.name?.toLowerCase() === 'owner' ? 0 : 1}${share.name}`,
  )

  return (
    <>
      <p className='modal-description'>Share your thoughtspace or add a device. Thoughts will be synced in realtime.</p>

      {permissionsSorted.map(([accessToken, share]) => {
        const isCurrent = accessToken === accessTokenCurrent
        return (
          <div key={accessToken} onClick={() => onSelect?.(accessToken)} style={{ cursor: 'pointer' }}>
            <ShareRow
              accessToken={accessToken}
              isCurrent={isCurrent}
              name={share.name}
              onDelete={() => {
                shareServer.delete(accessToken, share)
              }}
              role={share.role}
            />
          </div>
        )
      })}

      {showDeviceForm ? (
        <AddDeviceForm
          onCancel={() => setShowDeviceForm(false)}
          onSubmit={({ name, role }: Pick<ShareType, 'name' | 'role'>) => {
            const accessToken = shareServer.add({ role, name: name?.trim() })
            setShowDeviceForm(false)
            onAdd?.(accessToken)
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
              backgroundColor: colors.bg,
              border: `solid 1px ${colors.fg}`,
              color: colors.fg,
              display: 'inline-block',
            }}
          >
            + Add a device
          </a>
        </div>
      )}
    </>
  )
}

/** Permissions role label. */
const Role = ({ role }: { role: string }) => <>{role === 'owner' ? 'Full Access' : role}</>

/** Renders a single device share. */
const ShareRow = ({
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
  // const url = `${window.location.href}~/?share=${tsid}&auth=${accessToken}`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignSelf: 'start',
        margin: '1% auto',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'inline-flex' }}>
        <span style={{ padding: '0.75em 1em 0.75em 0' }}>
          <span style={{ display: 'inline-block', fontWeight: 'bold', marginRight: '1em', minWidth: '8em' }}>
            {name ?? 'Untitled'}
          </span>
          <Role role={role} />
        </span>{' '}
        <span
          style={{
            textAlign: 'left',
            fontStyle: 'italic',
            marginRight: '1em',
            margin: '0 10px',
            padding: '0.75em 0',
          }}
        >
          {isCurrent ? 'this device' : <a>view</a>}
        </span>
      </div>
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
  onSubmit: ({ name, role }: Pick<ShareType, 'name' | 'role'>) => void
  defaultName?: string
}) => {
  const colors = useSelector(themeColors)
  const [name, setName] = useState(defaultName ?? 'Untitled')
  return (
    <div style={{ margin: '0 auto' }}>
      <div style={{ borderBottom: 'solid 1px', borderBottomColor: colors.gray15, margin: '1em 0 3em' }} />
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

/** Detail view of a share that includes the QR code, url, edit name, and delete. */
const ShareDetail = ({
  accessToken,
  // provides a warning about removing the last device
  isLastDevice,
  onBack,
  share,
}: {
  accessToken: string
  isLastDevice?: boolean
  onBack: () => void
  share: ShareType
}) => {
  const dispatch = useDispatch()
  const ref = useRef<HTMLDivElement>(null)
  const colors = useSelector(themeColors)
  const fontSize = useSelector((state: State) => state.fontSize)
  // limits sharing and tells the user that they should create a new device share
  const isCurrent = accessToken === accessTokenCurrent

  const url = `${window.location.href}~/?share=${tsid}&auth=${accessToken}`

  /** Copy the share link to the clipboard. */
  const copyShareUrl = () => {
    navigator.clipboard.writeText(url)
    dispatch(alert('Share URL copied to clipboard', { clearDelay: 2000 }))
  }

  const onChangeName = useCallback(
    _.debounce((e: ContentEditableEvent) => {
      shareServer.update(accessToken, { ...share, name: e.target.value.trim() })
    }, 500),
    [],
  )

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: '0.5em' }}>
        <ContentEditable
          innerRef={ref}
          html={share.name || 'Untitled'}
          onChange={onChangeName}
          placeholder='Untitled'
          style={{ display: 'inline', fontSize: fontSize * 1.25, marginBottom: '0.5em' }}
        />
        <a
          onClick={() => {
            ref.current?.focus()
          }}
          style={{
            display: 'inline-block',
            marginLeft: '1em',
            position: 'absolute',
            top: 4,
            verticalAlign: 'bottom',
          }}
        >
          <PencilIcon fill={colors.gray} size={25} />
        </a>
      </div>

      {!isCurrent ? (
        <QRCodeSVG value={url} style={{ width: '100%', height: '100%' }} />
      ) : (
        <div
          style={{
            border: 'solid 1px',
            borderColor: colors.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              padding: '20px',
              width: '100%',
            }}
          >
            This is the current device. It is recommended that you create a separate device when sharing this
            thoughtspace in order to control access.
          </div>
          {/* response spacer square */}
          <div
            style={{
              width: 0,
              height: 0,
              paddingBottom: '100%',
            }}
          ></div>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <span>
          <input
            type={isCurrent ? 'password' : 'text'}
            value={url}
            readOnly={true}
            style={{
              color: isCurrent ? colors.gray : undefined,
              margin: '10px',
              padding: '0.75em 3em 0.75em 1em',
              minWidth: 0,
              width: '75%',
            }}
          />
        </span>
        <span
          onClick={!isCurrent ? copyShareUrl : undefined}
          style={{
            opacity: isCurrent ? 0.5 : undefined,
            position: 'absolute',
            top: '0.75em',
            right: '1.25em',
            cursor: 'pointer',
          }}
        >
          {isTouch ? <ShareIcon size={22} /> : <CopyClipboard size={22} />}
        </span>
      </div>

      <p style={{ color: colors.gray }}>
        Created: {new Date(share.created).toLocaleString()}
        <br />
        Last Accessed: {new Date(share.accessed).toLocaleString()}
      </p>

      {onBack && (
        <a
          onClick={onBack}
          className={classNames({
            button: true,
            'action-button': true,
          })}
          style={{
            color: colors.bg,
            fontSize: 18,
            lineHeight: 2,
            marginBottom: '1em',
          }}
        >
          Back
        </a>
      )}

      <div style={{ marginTop: '4em' }}>
        <p style={{ color: colors.gray, marginTop: '0.5em' }}>
          {isLastDevice
            ? 'This is the last device with access to this thoughtspace. If you clear the thoughtspace, all thoughts will be permanently deleted.'
            : isCurrent
            ? 'When removed, you will lose access to the thoughtspace on this device.'
            : `When removed, the link and QR code will no longer work, though the device may retain a cache of thoughts that
          were saved for offline use.`}
        </p>
        <a
          onClick={() => {
            shareServer.delete(accessToken, share)
          }}
          style={{ color: colors.red }}
        >
          {isLastDevice ? 'Delete all thoughts' : 'Remove device'}
        </a>
      </div>
    </div>
  )
}

const ModalShareMemo = React.memo(ModalShare)

export default ModalShareMemo
