import _ from 'lodash'
import { QRCodeSVG } from 'qrcode.react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css, cx } from '../../../styled-system/css'
import { anchorButtonRecipe, extendTapRecipe, modalTextRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import Index from '../../@types/IndexType'
import Role from '../../@types/Role'
import Share from '../../@types/Share'
import { alertActionCreator as alert } from '../../actions/alert'
import { isMac } from '../../browser'
import { accessToken as accessTokenCurrent, permissionsClientDoc, tsid } from '../../data-providers/yjs'
import permissionsModel from '../../data-providers/yjs/permissionsModel'
import * as selection from '../../device/selection'
import useSharedType from '../../hooks/useSharedType'
import useStatus from '../../hooks/useStatus'
import modalDescriptionClass from '../../recipes/modalDescriptionClass'
import fastClick from '../../util/fastClick'
import strip from '../../util/strip'
import assertRef from '../../util/typeUtils'
import FadeTransition from '../FadeTransition'
import ActionButton from './../ActionButton'
import ContentEditable, { ContentEditableEvent } from './../ContentEditable'
import CopyClipboard from './../icons/CopyClipboard'
import PencilIcon from './../icons/PencilIcon'
import ModalComponent from './ModalComponent'

/** A hook that subscribes to the permissionsClientDoc. */
const usePermissions = (): Index<Share> => useSharedType(permissionsClientDoc.getMap<Share>())

/** Gets the next available device name for a new device. Autoincrements by 1. */
const getNextDeviceName = (permissions: Index<Share>, start?: number): string => {
  const nextDeviceNumber = start ?? Object.keys(permissions).length + 1
  return Object.values(permissions).some(share => share.name === `Device ${nextDeviceNumber}`)
    ? getNextDeviceName(permissions, nextDeviceNumber + 1)
    : `Device ${nextDeviceNumber}`
}
/** Permissions role label. */
const RoleLabel = ({ role }: { role: Role }) => <>{role === 'owner' ? 'Full Access' : role}</>

/** Renders a single device share. */
const ShareRow = React.memo(
  ({ isCurrent, role, share }: { accessToken: string; isCurrent?: boolean; share: Share; role: Role }) => {
    return (
      <div
        className={css({
          display: 'flex',
          flexDirection: 'row',
          alignSelf: 'start',
          margin: '1% auto',
          alignItems: 'center',
        })}
      >
        <div className={css({ display: 'inline-flex' })}>
          <span className={css({ padding: '0.75em 1em 0.75em 0' })}>
            <span className={css({ display: 'inline-block', fontWeight: 'bold', marginRight: '1em', minWidth: '8em' })}>
              {share?.name || 'Untitled'}
            </span>
            <RoleLabel role={role} />
          </span>{' '}
          <span
            className={css({
              textAlign: 'left',
              fontStyle: 'italic',
              marginRight: '1em',
              margin: '0 10px',
              padding: '0.75em 0',
            })}
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
  const [name, setName] = useState(defaultName ?? 'Untitled')
  return (
    <div className={css({ margin: '0 auto' })}>
      <div
        className={css({
          borderBottom: 'solid 1px',
          borderBottomColor: 'gray15',
          margin: '1em auto 3em',
          width: 'calc(100% - 4em)',
        })}
      />
      <div>
        <span className={css({ marginRight: '1em' })}>Name: </span>
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
          className={css({ display: 'inline', width: '10em', minWidth: '5em', marginRight: '1em' })}
        />
      </div>

      <div>
        <span className={css({ marginRight: '1em' })}>Access: </span>
        <span
          className={css({
            display: 'inline-block',
            fontSize: '16px',
            marginRight: '1em',
            marginBottom: '2vh',
            minWidth: '5em',
            padding: '10px 1.75em 10px 0',
            textAlign: 'left',
            width: '10em',
          })}
        >
          Full Access
        </span>
      </div>

      <div>
        <a
          {...fastClick(() => onSubmit({ name, role: 'owner' }))}
          className={cx(
            anchorButtonRecipe({
              outline: true,
            }),
            css({ display: 'inline-block' }),
          )}
        >
          Add
        </a>
        <a {...fastClick(onCancel)} className={css({ color: 'gray66', marginLeft: '1em' })}>
          Cancel
        </a>
      </div>
    </div>
  )
}

/** The list of device shares for the thoughtspace. */
const ShareList = React.forwardRef<
  HTMLDivElement,
  {
    onAdd?: (accessToken: string) => void
    onSelect?: (accessToken: string) => void
    permissions: Index<Share>
  }
>(({ onAdd, onSelect, permissions }, ref) => {
  const status = useStatus()
  const dispatch = useDispatch()
  const store = useStore()

  const [showDeviceForm, setShowDeviceForm] = useState(false)

  // sort the owner to the top, then sort by name
  const permissionsSorted = _.sortBy(
    Object.entries(permissions),
    ([, share]) => `${share.name?.toLowerCase() === 'owner' ? 0 : 1}${share.name}`,
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
      <p className={modalDescriptionClass}>Add or remove devices that can access and edit this thoughtspace.</p>

      {status === 'connected' ? (
        <>
          {/* Device list */}
          <div className={css({ marginBottom: '2em' })}>
            {permissionsSorted.map(([accessToken, share]) => {
              const isCurrent = accessToken === accessTokenCurrent
              return (
                <div
                  key={accessToken}
                  {...fastClick(() => onSelect?.(accessToken))}
                  className={css({ cursor: 'pointer' })}
                >
                  <ShareRow accessToken={accessToken} isCurrent={isCurrent} share={share} role={share.role} />
                </div>
              )
            })}
          </div>

          {/* Add a device */}
          <TransitionGroup>
            {
              // form
              showDeviceForm ? (
                <FadeTransition id='add-device-form' type='medium' exit={false} unmountOnExit>
                  <div>
                    <AddDeviceForm
                      onCancel={() => setShowDeviceForm(false)}
                      onSubmit={({ name, role }: Pick<Share, 'name' | 'role'>) => {
                        const result: { accessToken?: string; error?: string } = permissionsModel.add({
                          role,
                          name: strip(name || ''),
                        })
                        // TODO: permissionsModel.add does not yet return { error }
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
                </FadeTransition>
              ) : (
                // "+ Add a device" button
                <FadeTransition id='add-a-device' exit={false} type='medium' unmountOnExit>
                  <div className={css({ marginTop: '1em' })}>
                    <a
                      {...fastClick(() => setShowDeviceForm(true))}
                      className={cx(
                        anchorButtonRecipe({
                          outline: true,
                        }),
                        css({ display: 'inline-block' }),
                      )}
                    >
                      + Add a device
                    </a>
                  </div>
                </FadeTransition>
              )
            }
          </TransitionGroup>
        </>
      ) : (
        <div className={css({ color: 'gray66', fontSize: 18, fontStyle: 'italic', margin: '40px 0 20px 0' })}>
          <p>This device is currently offline</p>
          <p>Please connect to the Internet to manage sharing.</p>
        </div>
      )}
    </div>
  )
})

ShareList.displayName = 'ShareList'

/** Renders an editable name with a pencil icon to focus. */
const EditableName = React.memo(
  ({ onChange, value }: { onChange: (e: ContentEditableEvent) => void; value: string }) => {
    const fontSize = useSelector(state => state.fontSize)
    const ref = useRef<HTMLDivElement>(null)
    return (
      <div className={css({ position: 'relative' })}>
        <ContentEditable
          className={css({ '&:focus': { borderBottom: 'solid 1px' }, display: 'inline', marginBottom: '0.5em' })}
          innerRef={assertRef(ref)}
          html={value}
          onChange={onChange}
          placeholder='Untitled'
          style={{ fontSize: fontSize * 1.25 }}
        />
        <a
          {...fastClick(() => {
            selection.set(ref.current, { end: true })
          })}
          className={css({
            display: 'inline-block',
            marginLeft: '1em',
            position: 'absolute',
            top: 4,
            verticalAlign: 'bottom',
          })}
        >
          <PencilIcon fill={token('colors.gray66')} size={25} />
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
      share: Share
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

      // limits sharing and tells the user that they should create a new device share
      const isCurrent = accessToken === accessTokenCurrent

      const url = `${window.location.origin}/~/?share=${tsid}&auth=${accessToken}`

      /** Copy the share link to the clipboard. */
      const copyShareUrl = useCallback(
        () => {
          // flash the share url input without re-rendering the whole component
          const color = shareUrlInputRef.current?.style.color || ''
          const textStrokeWidth = shareUrlInputRef.current?.style.webkitTextStrokeWidth || ''
          if (shareUrlInputRef.current) {
            shareUrlInputRef.current.style.color = token.var('colors.highlight')
            shareUrlInputRef.current.style.webkitTextStrokeWidth = 'medium'
          }
          setTimeout(() => {
            if (shareUrlInputRef.current) {
              shareUrlInputRef.current.style.color = color
              shareUrlInputRef.current.style.webkitTextStrokeWidth = textStrokeWidth
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
          <div className={css({ marginBottom: '0.5em' })}>
            <EditableName onChange={onChangeName} value={share?.name || 'Untitled'} />
          </div>

          {!isCurrent ? (
            <QRCodeSVG
              value={url}
              className={css({
                width: '100%',
                height: '100%',
                minWidth: '200px',
                minHeight: '200px',
                // keep visible by sizing it to the shortest screen dimension, leaving room for the top margin and share url input
                maxWidth: 'calc(min(100vw, 100vh - 270px))',
                maxHeight: 'calc(min(100vw, 100vh - 270px))',
              })}
            />
          ) : (
            <div
              className={css({
                margin: '3em 0 4em',
              })}
              style={{ fontSize }}
            >
              <p>This is the current device.</p>
            </div>
          )}

          {!isCurrent && (
            <div className={css({ position: 'relative' })}>
              <span>
                <input
                  ref={shareUrlInputRef}
                  type='text'
                  value={url}
                  readOnly
                  className={css({ margin: '10px', padding: '0.75em 3em 0.75em 1em', minWidth: 0, width: '75%' })}
                />
              </span>
              <span
                {...fastClick(copyShareUrl)}
                className={css({ position: 'absolute', top: '0.75em', right: '1.25em', cursor: 'pointer' })}
              >
                <CopyClipboard size={22} />
              </span>
            </div>
          )}

          <p className={css({ color: 'gray66' })}>
            Created: {new Date(share.created).toLocaleString()}
            <br />
            Last Accessed: {share.accessed ? new Date(share.accessed).toLocaleString() : 'never'}
          </p>

          {onBack && (
            <a
              {...fastClick(onBack)}
              className={cx(
                anchorButtonRecipe({
                  actionButton: true,
                  // extendTap overrides default button padding
                  extendTap: true,
                }),
                css({ color: 'bg', marginBottom: '1.5em' }),
              )}
              style={{ fontSize }}
            >
              Back
            </a>
          )}

          <div className={css({ marginTop: '4em' })}>
            <p className={css({ color: 'gray66', marginTop: '0.5em' })}>
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
              className={cx(extendTapRecipe(), css({ color: 'red' }))}
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
/** Modal for Sharing and Device Management. */
const ModalDevices = () => {
  const permissions = usePermissions()

  // selected accessToken
  const [selected, setSelected] = useState<string | null>(null)

  const onBack = useCallback(() => setSelected(null), [])

  const modalClasses = modalTextRecipe()
  return (
    <ModalComponent
      id='devices'
      title='Device Management'
      center
      // do not show the close button on the detail view, since it renders the "Remove device" link at the very bottom of the page
      actions={({ close }) =>
        !selected ? <ActionButton key='close' title='Close' {...fastClick(() => close())} /> : null
      }
    >
      <div className={modalClasses.wrapper}>
        <TransitionGroup>
          {selected && permissions[selected] ? (
            <FadeTransition key='share-detail' id='share-detail' type='medium' exit={false} unmountOnExit>
              <ShareDetail
                accessToken={selected}
                isLastDevice={Object.keys(permissions).length === 1}
                onBack={onBack}
                share={permissions[selected]}
              />
            </FadeTransition>
          ) : (
            <FadeTransition id='share-list' type='medium' exit={false} unmountOnExit>
              <ShareList onAdd={setSelected} onSelect={setSelected} permissions={permissions} />
            </FadeTransition>
          )}
        </TransitionGroup>
      </div>
    </ModalComponent>
  )
}
const ModalShareMemo = React.memo(ModalDevices)

export default ModalShareMemo
