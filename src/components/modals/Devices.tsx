import classNames from 'classnames'
import _ from 'lodash'
import { QRCodeSVG } from 'qrcode.react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import Share from '../../@types/Share'
import { alertActionCreator as alert } from '../../actions/alert'
import { isMac } from '../../browser'
import { PermissionDocType } from '../../data-providers/rxdb/schemas/permission'
import { rxDB } from '../../data-providers/rxdb/thoughtspace'
import { accessToken as accessTokenCurrent, tsid } from '../../data-providers/yjs'
import permissionsModel from '../../data-providers/yjs/permissionsModel'
import * as selection from '../../device/selection'
import useObserveCol from '../../hooks/useObserveCol'
import useStatus from '../../hooks/useStatus'
import themeColors from '../../selectors/themeColors'
import fastClick from '../../util/fastClick'
import strip from '../../util/strip'
import { ActionButton } from './../ActionButton'
import ContentEditable, { ContentEditableEvent } from './../ContentEditable'
import CopyClipboard from './../icons/CopyClipboard'
import PencilIcon from './../icons/PencilIcon'
import ModalComponent from './ModalComponent'

/** A hook that subscribes to the permissionsClientDoc. */
const usePermissions = (): PermissionDocType[] => useObserveCol<PermissionDocType>(rxDB.permissions)

/** Gets the next available device name for a new device. Autoincrements by 1. */
const getNextDeviceName = (permissions: PermissionDocType[], start?: number): string => {
  const nextDeviceNumber = start ?? permissions.length + 1
  return permissions.some(share => share.name === `Device ${nextDeviceNumber}`)
    ? getNextDeviceName(permissions, nextDeviceNumber + 1)
    : `Device ${nextDeviceNumber}`
}

/** Modal for Sharing and Device Management. */
const ModalDevices = () => {
  const permissions = usePermissions()
  const shareDetailRef = useRef<HTMLDivElement>(null)
  const shareListRef = useRef<HTMLDivElement>(null)

  // selected accessToken
  const [selected, setSelected] = useState<string | null>(null)

  const selectedPermission = useMemo(() => permissions.find(share => share.id === selected), [permissions, selected])

  const onBack = useCallback(() => setSelected(null), [])

  return (
    <ModalComponent
      id='devices'
      title='Device Management'
      className='popup'
      center
      // do not show the close button on the detail view, since it renders the "Remove device" link at the very bottom of the page
      actions={({ close }) =>
        !selected ? <ActionButton key='close' title='Close' {...fastClick(() => close())} /> : null
      }
    >
      <div className='modal-wrapper'>
        <TransitionGroup>
          {selected && selectedPermission ? (
            <CSSTransition
              key='share-detail'
              nodeRef={shareDetailRef}
              classNames='fade-400'
              exit={false}
              timeout={400}
              unmountOnExit
            >
              <ShareDetail
                ref={shareDetailRef}
                accessToken={selected}
                isLastDevice={permissions.length === 1}
                onBack={onBack}
                share={selectedPermission}
              />
            </CSSTransition>
          ) : (
            <CSSTransition
              key='share-list'
              nodeRef={shareListRef}
              classNames='fade-400'
              exit={false}
              timeout={400}
              unmountOnExit
            >
              <ShareList ref={shareListRef} onAdd={setSelected} onSelect={setSelected} permissions={permissions} />
            </CSSTransition>
          )}
        </TransitionGroup>
      </div>
    </ModalComponent>
  )
}

/** The list of device shares for the thoughtspace. */
const ShareList = React.forwardRef<
  HTMLDivElement,
  {
    onAdd?: (accessToken: string) => void
    onSelect?: (accessToken: string) => void
    permissions: PermissionDocType[]
  }
>(({ onAdd, onSelect, permissions }, ref) => {
  const status = useStatus()
  const dispatch = useDispatch()
  const store = useStore()
  const colors = useSelector(themeColors)
  const [showDeviceForm, setShowDeviceForm] = useState(false)

  // sort the owner to the top, then sort by name
  const permissionsSorted = _.sortBy(
    permissions,
    share => `${share.name?.toLowerCase() === 'owner' ? 0 : 1}${share.name}`,
  )

  /** Keyboad shortcuts. */
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // TODO: Handle modal-specific keyboard shortcuts in a more general way so that they can be used in other modals and so this component does not need to know about showCommandPalette
      if (e.key === 'Enter' && !showDeviceForm && !store.getState().showCommandPalette) {
        e.stopPropagation()
        setShowDeviceForm(true)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(
    () => {
      window.addEventListener('keydown', onKeyDown)
      return () => {
        window.removeEventListener('keydown', onKeyDown)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div ref={ref}>
      <p className='modal-description'>Add or remove devices that can access and edit this thoughtspace.</p>

      {status === 'connected' ? (
        <>
          {/* Device list */}
          <div style={{ marginBottom: '2em' }}>
            {permissionsSorted.map(share => {
              const isCurrent = share.id === accessTokenCurrent
              return (
                <div key={share.id} {...fastClick(() => onSelect?.(share.id))} style={{ cursor: 'pointer' }}>
                  <ShareRow accessToken={share.id} isCurrent={isCurrent} share={share} role={share.role} />
                </div>
              )
            })}
          </div>

          {/* Add a device */}
          <TransitionGroup>
            {
              // form
              showDeviceForm ? (
                <CSSTransition key='add-device-form' classNames='fade-400' exit={false} timeout={400} unmountOnExit>
                  <div>
                    <AddDeviceForm
                      onCancel={() => setShowDeviceForm(false)}
                      onSubmit={async ({ name, role }: Pick<Share, 'name' | 'role'>) => {
                        const result: { accessToken?: string; error?: string } = await permissionsModel.add({
                          role,
                          name: strip(name || ''),
                        })
                        if (!result.error) {
                          setShowDeviceForm(false)
                          onAdd?.(result.accessToken!)
                        } else {
                          dispatch(alert('Not connected to server. Unable to add device.', { clearDelay: 2000 }))
                        }
                      }}
                      defaultName={getNextDeviceName(permissions)}
                    />
                  </div>
                </CSSTransition>
              ) : (
                // "+ Add a device" button
                <CSSTransition key='add-a-device' classNames='fade-400' exit={false} timeout={400} unmountOnExit>
                  <div style={{ marginTop: '1em' }}>
                    <a
                      {...fastClick(() => setShowDeviceForm(true))}
                      className={classNames({
                        button: true,
                        'button-outline': true,
                      })}
                      style={{
                        display: 'inline-block',
                      }}
                    >
                      + Add a device
                    </a>
                  </div>
                </CSSTransition>
              )
            }
          </TransitionGroup>
        </>
      ) : (
        <div style={{ color: colors.gray, fontSize: 18, fontStyle: 'italic', margin: '40px 0 20px 0' }}>
          <p>This device is currently offline</p>
          <p>Please connect to the Internet to manage sharing.</p>
        </div>
      )}
    </div>
  )
})

ShareList.displayName = 'ShareList'

/** Permissions role label. */
const RoleLabel = ({ role }: { role: PermissionDocType['role'] }) => <>{role === 'owner' ? 'Full Access' : role}</>

/** Renders a single device share. */
const ShareRow = React.memo(
  ({
    accessToken,
    isCurrent,
    role,
    share,
  }: {
    accessToken: string
    isCurrent?: boolean
    share: PermissionDocType
    role: PermissionDocType['role']
  }) => {
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
              {share?.name || 'Untitled'}
            </span>
            <RoleLabel role={role} />
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
  },
)
ShareRow.displayName = 'ShareRow'

/** The form that allows the user to add a new device. */
const AddDeviceForm = ({
  onCancel,
  onSubmit,
  defaultName,
}: {
  onCancel: () => void
  onSubmit: ({ name, role }: Pick<Share, 'name' | 'role'>) => void
  defaultName?: string
}) => {
  const colors = useSelector(themeColors)
  const [name, setName] = useState(defaultName ?? 'Untitled')
  return (
    <div style={{ margin: '0 auto' }}>
      <div
        style={{
          borderBottom: 'solid 1px',
          borderBottomColor: colors.gray15,
          margin: '1em auto 3em',
          width: 'calc(100% - 4em)',
        }}
      />
      <div>
        <span style={{ marginRight: '1em' }}>Name: </span>
        <input
          ref={el => el?.focus()}
          type='text'
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.stopPropagation()
              onSubmit({ name, role: 'owner' })
            }
            // TODO: The modal escape currently takes precedence
            else if (e.key === 'Escape') {
              e.stopPropagation()
              onCancel()
            }
          }}
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
          {...fastClick(() => onSubmit({ name, role: 'owner' }))}
          className={classNames({
            button: true,
            'button-outline': true,
          })}
          style={{
            display: 'inline-block',
          }}
        >
          Add
        </a>
        <a
          {...fastClick(onCancel)}
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

/** Renders an editable name with a pencil icon to focus. */
const EditableName = React.memo(
  ({ onChange, value }: { onChange: (e: ContentEditableEvent) => void; value: string }) => {
    const colors = useSelector(themeColors)
    const fontSize = useSelector(state => state.fontSize)
    const ref = useRef<HTMLDivElement>(null)
    return (
      <div style={{ position: 'relative' }}>
        <ContentEditable
          className='active-underline'
          innerRef={ref}
          html={value}
          onChange={onChange}
          placeholder='Untitled'
          style={{ display: 'inline', fontSize: fontSize * 1.25, marginBottom: '0.5em' }}
        />
        <a
          {...fastClick(() => {
            selection.set(ref.current, { end: true })
          })}
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
    )
  },
)
EditableName.displayName = 'EditableName'

/** Detail view of a share that includes the QR code, url, edit name, and delete. */
const ShareDetail = React.memo(
  React.forwardRef<
    HTMLDivElement,
    {
      accessToken: string
      isLastDevice?: boolean
      onBack: () => void
      share: PermissionDocType
    }
  >(
    (
      {
        accessToken,
        // provides a warning about removing the last device
        isLastDevice,
        onBack,
        share,
      },
      ref,
    ) => {
      const shareUrlInputRef = useRef<HTMLInputElement>(null)
      const dispatch = useDispatch()
      const fontSize = useSelector(state => state.fontSize)
      const colors = useSelector(themeColors)
      // limits sharing and tells the user that they should create a new device share
      const isCurrent = accessToken === accessTokenCurrent

      const url = `${window.location.origin}/~/?share=${tsid}&auth=${accessToken}`

      /** Copy the share link to the clipboard. */
      const copyShareUrl = useCallback(
        () => {
          // flash the share url input without re-rendering the whole component
          const color = shareUrlInputRef.current?.style.color || ''
          const textStrokeWidth = shareUrlInputRef.current?.style['WebkitTextStrokeWidth' as any] || ''
          if (shareUrlInputRef.current) {
            shareUrlInputRef.current.style.color = colors.highlight
            shareUrlInputRef.current.style['WebkitTextStrokeWidth' as any] = 'medium'
          }
          setTimeout(() => {
            if (shareUrlInputRef.current) {
              shareUrlInputRef.current.style.color = color
              shareUrlInputRef.current.style['WebkitTextStrokeWidth' as any] = textStrokeWidth
            }
          }, 200)

          navigator.clipboard.writeText(url)
          dispatch(alert('Share URL copied to clipboard', { clearDelay: 2000 }))
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [url],
      )

      // eslint-disable-next-line react-hooks/exhaustive-deps
      const onChangeName = useCallback(
        _.debounce((e: ContentEditableEvent) => {
          permissionsModel.update(accessToken, { ...share, name: e.target.value.trim() })
        }, 500),
        [],
      )

      /** Copy the share url on Cmd/Ctrl + C. */
      const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
          if (
            e.key === 'c' &&
            (isMac ? e.metaKey : e.ctrlKey) &&
            // do not override copy shortcut if user has text selected
            selection.isCollapsed() !== false &&
            // input selection is not reflected in window.getSelection()
            shareUrlInputRef.current?.selectionStart === shareUrlInputRef.current?.selectionEnd
          ) {
            e.stopPropagation()
            copyShareUrl()
          }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
      )

      useEffect(
        () => {
          window.addEventListener('keydown', onKeyDown)
          return () => {
            window.removeEventListener('keydown', onKeyDown)
          }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
      )

      return (
        <div ref={ref}>
          <div style={{ marginBottom: '0.5em' }}>
            <EditableName onChange={onChangeName} value={share?.name || 'Untitled'} />
          </div>

          {!isCurrent ? (
            <QRCodeSVG
              value={url}
              style={{
                width: '100%',
                height: '100%',
                minWidth: '200px',
                minHeight: '200px',
                // keep visible by sizing it to the shortest screen dimension, leaving room for the top margin and share url input
                maxWidth: 'calc(min(100vw, 100vh - 270px))',
                maxHeight: 'calc(min(100vw, 100vh - 270px))',
              }}
            />
          ) : (
            <div
              style={{
                fontSize,
                margin: '3em 0 4em',
              }}
            >
              <p>This is the current device.</p>
            </div>
          )}

          {!isCurrent && (
            <div style={{ position: 'relative' }}>
              <span>
                <input
                  ref={shareUrlInputRef}
                  type='text'
                  value={url}
                  readOnly
                  style={{
                    margin: '10px',
                    padding: '0.75em 3em 0.75em 1em',
                    minWidth: 0,
                    width: '75%',
                  }}
                />
              </span>
              <span
                {...fastClick(copyShareUrl)}
                style={{
                  position: 'absolute',
                  top: '0.75em',
                  right: '1.25em',
                  cursor: 'pointer',
                }}
              >
                <CopyClipboard size={22} />
              </span>
            </div>
          )}

          <p style={{ color: colors.gray }}>
            Created: {new Date(share.created).toLocaleString()}
            <br />
            Last Accessed: {share.accessed ? new Date(share.accessed).toLocaleString() : 'never'}
          </p>

          {onBack && (
            <a
              {...fastClick(onBack)}
              className={classNames({
                button: true,
                'action-button': true,
                'extend-tap': true,
              })}
              style={{
                color: colors.bg,
                fontSize,
                marginBottom: '1.5em',
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
                permissionsModel.delete(accessToken, share)
                onBack()
              }}
              className='extend-tap'
              style={{ color: colors.red }}
            >
              {isLastDevice ? 'Delete all thoughts' : 'Remove device'}
            </a>
          </div>
        </div>
      )
    },
  ),
)
ShareDetail.displayName = 'ShareDetail'

const ModalShareMemo = React.memo(ModalDevices)

export default ModalShareMemo
