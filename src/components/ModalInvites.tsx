import React, { useState, useEffect, useRef } from 'react'
import { connect, useDispatch } from 'react-redux'
import { InviteCodes, State } from '../@types'
import InvitesIcon from './icons/InvitesIcon'
import CheckmarkIcon from './icons/CheckmarkIcon'
import CopyClipboard from './icons/CopyClipboard'
import { alert, createUserInvites } from '../action-creators'
import { isTouch } from '../browser'
import { theme } from '../selectors'
import { createId, timestamp } from '../util'
import { ActionButton } from './ActionButton'
import Modal from './Modal'
import Input from './Input'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { authenticated, user: { uid = '' } = {}, invites } = state
  return {
    dark: theme(state) !== 'Light',
    uid,
    authenticated,
    invites,
  }
}

/** Modal to get gift codes. */
const ModalInvites = ({ dark, uid, authenticated, invites }: ReturnType<typeof mapStateToProps>) => {
  let giftCodes: { link: string; used: boolean }[] = []
  const isMounted = useRef(false)
  const dispatch = useDispatch()

  const [inputType, updateInputType] = useState(['password', 'password', 'password'])

  const [selectedGiftCode, updateSelectedGiftCode] = useState(-1)
  const [copiedGiftCode, updateCopiedGiftCode] = useState('')
  const [giftCode, updateGiftCode] = useState(giftCodes)

  let inviteCodeCnt = 0

  // eslint-disable-next-line jsdoc/require-jsdoc
  const generateInviteCode = () => {
    if (inviteCodeCnt > 2) return

    inviteCodeCnt++

    const inviteId = createId().slice(0, 8)
    const newInviteCode: InviteCodes = {
      createdBy: uid,
      created: timestamp(),
    }

    dispatch(createUserInvites(newInviteCode, inviteId, uid))

    generateInviteCode()
  }

  // eslint-disable-next-line jsdoc/require-jsdoc
  const createGiftCode = (invite: InviteCodes = {}) => {
    giftCodes = [
      ...giftCodes,
      {
        link: `${window.location.origin}/signup?code=${invite.id}`,
        used: !!invite.used,
      },
    ]

    updateGiftCode(giftCodes)
  }

  useEffect(() => {
    if (authenticated) {
      if (!isMounted.current) {
        isMounted.current = true
        if (invites.length === 0) {
          generateInviteCode()
        } else {
          invites.forEach((invite: InviteCodes) => {
            return createGiftCode(invite)
          })
        }
      }
    }

    return () => {
      isMounted.current = false
    }
  }, [authenticated, invites])

  /** Handle onFocus and onBlur event. */
  const changeType = (idx: number, actionType: string) => {
    let newIndex = idx

    if (actionType === 'blur') {
      newIndex = idx === selectedGiftCode ? -1 : idx
    }

    inputType[idx] = 'text'
    updateInputType([...inputType])
    updateSelectedGiftCode(newIndex)
  }

  /** Copy text to clipboard. */
  const updateCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    updateCopiedGiftCode(text)
  }

  const firstUpdate = useRef(true)

  // alert when invites code is copied to clipboard
  useEffect(() => {
    if (!firstUpdate.current) {
      dispatch(alert('Invite code copied to clipboard', { clearTimeout: 2000 }))
    } else {
      firstUpdate.current = false
    }
  }, [copiedGiftCode])

  if (!authenticated) {
    return <div>You arent allowed to view this page. </div>
  }

  return (
    <Modal
      id='invites'
      title='Gift codes'
      className='popup'
      center
      actions={({ close }) => (
        <div style={undefined}>
          <ActionButton key='close' title='Close' onClick={() => close()} />
        </div>
      )}
    >
      <div className='modal-wrapper'>
        <p className='modal-description'>
          You get three shinny gift codes to share <b>em</b> with anyone you choose!
        </p>
        {giftCode.map(({ link, used }, idx) => {
          return (
            <div key={`${idx}-gift-code`} className='gift-code-wrapper'>
              <div
                style={{ display: 'inline-flex' }}
                onClick={() => changeType(idx, selectedGiftCode === idx ? 'blur' : 'focus')}
              >
                <InvitesIcon fill={selectedGiftCode !== idx ? 'grey' : undefined} size={26} />
              </div>
              <Input
                type={inputType[idx]}
                placeholder='gift-code'
                value={link}
                onBlur={() => changeType(idx, 'blur')}
                onFocus={() => changeType(idx, 'focus')}
              />
              {used ? (
                <CheckmarkIcon fill={selectedGiftCode !== idx ? 'grey' : undefined} size={21} />
              ) : (
                <CheckmarkIcon fill={dark ? 'black' : 'white'} size={21} />
              )}
              {isTouch && (
                <div style={{ display: 'inline-flex' }} onClick={() => updateCopy(link)}>
                  <CopyClipboard fill={selectedGiftCode !== idx ? 'grey' : undefined} size={26} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

export default connect(mapStateToProps)(ModalInvites)
