import React, { useState, useEffect, useRef } from 'react'
import { connect, useDispatch } from 'react-redux'
import _ from 'lodash'
import { InviteCodes, State } from '../@types'
import InvitesIcon from './icons/InvitesIcon'
import CheckmarkIcon from './icons/CheckmarkIcon'
import CopyClipboard from './icons/CopyClipboard'
import { alert, createUserInvites, updateInviteCode, getUserInvites } from '../action-creators'
import { theme } from '../selectors'
import { createId, timestamp } from '../util'
import { ActionButton } from './ActionButton'
import Modal from './Modal'
import Input from './Input'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { authenticated, user: { uid = '' } = {}, userInvites } = state
  return {
    dark: theme(state) !== 'Light',
    uid,
    authenticated,
    userInvites,
  }
}

interface GiftCodeArray extends Record<string, any> {
  link: string
  used: boolean
  seen: boolean | undefined
  id: string | undefined
  type: string
}

/** Modal to get gift codes. */
const ModalInvites = ({ dark, uid, authenticated, userInvites }: ReturnType<typeof mapStateToProps>) => {
  const isMounted = useRef(false)
  const inviteCodeCnt = useRef(0)
  const firstUpdate = useRef(true)
  const giftCodeType: InviteCodes[] = []
  const giftCodesRefs = useRef(giftCodeType)

  const dispatch = useDispatch()

  const [focusedGiftCode, updateFocusedGiftCode] = useState(-1)
  const [copiedGiftCode, updateCopiedGiftCode] = useState('')
  const [giftCode, updateGiftCode] = useState<GiftCodeArray[] | []>([])

  /** Function to generate invite code. */
  const generateInviteCode = () => {
    if (inviteCodeCnt.current > 2) return

    inviteCodeCnt.current++

    const inviteId = createId().slice(0, 8)
    const newInviteCode = {
      id: inviteId,
      createdBy: uid,
      created: timestamp(),
      hasSeen: false,
    }

    giftCodesRefs.current = [...giftCodesRefs.current, { ...newInviteCode }]
    generateInviteCode()
  }

  useEffect(() => {
    if (authenticated) {
      if (!userInvites) {
        generateInviteCode()
        dispatch(createUserInvites(giftCodesRefs.current, uid))
      }

      if (!isMounted.current) {
        if (userInvites && userInvites.length === 3) updateGiftCodes()
      } else {
        isMounted.current = true
      }
    }
  }, [authenticated, userInvites])

  useEffect(() => {
    if (focusedGiftCode !== -1) dispatch(getUserInvites(uid))
  }, [focusedGiftCode])

  /** Sets user invites in state. */
  const updateGiftCodes = () => {
    const giftCodes: GiftCodeArray[] = userInvites
      ? userInvites.map((invite: InviteCodes) => ({
          link: `${window.location.origin}/signup?code=${invite.id}`,
          used: !!invite.used,
          seen: invite.hasSeen,
          id: invite.id,
          type: invite.hasSeen ? 'text' : 'password',
        }))
      : []
    updateGiftCode(_.sortBy(giftCodes, ['id']))
  }

  /** Handle onFocus and onBlur event. */
  const changeType = (idx: number | any, id: string | any, actionType: string) => {
    if (actionType === 'focus') {
      const isVisible = giftCode.find(({ id: inviteId }) => id === inviteId)?.seen
      if (!isVisible) dispatch(updateInviteCode(uid, id, false))
    }
    updateFocusedGiftCode(actionType === 'focus' ? idx : -1)
  }

  /** Copy text to clipboard. */
  const updateCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    updateCopiedGiftCode(text)
  }

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
        {giftCode.map(({ link, used, id, type }, idx) => {
          const selectedIconFill = focusedGiftCode !== idx ? 'grey' : undefined
          return (
            <div key={`${idx}-gift-code`} className='gift-code-wrapper'>
              <div
                style={{ display: 'inline-flex' }}
                onClick={() => changeType(idx, id, focusedGiftCode === idx ? 'blur' : 'focus')}
              >
                <InvitesIcon fill={selectedIconFill} size={26} />
              </div>
              <Input
                type={type}
                placeholder='gift-code'
                value={link}
                onBlur={() => changeType(idx, id, 'blur')}
                onFocus={() => changeType(idx, id, 'focus')}
                onChange={() => changeType(idx, id, 'change')}
              />
              {used ? (
                <CheckmarkIcon fill={selectedIconFill} size={21} />
              ) : (
                <CheckmarkIcon fill={dark ? 'black' : 'white'} size={21} />
              )}
              <div className='copy-icon-wrapper' onClick={() => updateCopy(link)}>
                <CopyClipboard fill={selectedIconFill} size={26} />
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

export default connect(mapStateToProps)(ModalInvites)
