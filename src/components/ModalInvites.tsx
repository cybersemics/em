import React, { useState, useEffect, useRef } from 'react'
import { connect, useDispatch } from 'react-redux'
import _ from 'lodash'
import { InviteCodes, State, Firebase } from '../@types'
import InvitesIcon from './icons/InvitesIcon'
import CheckmarkIcon from './icons/CheckmarkIcon'
import CopyClipboard from './icons/CopyClipboard'
import { alert, updateInviteCode } from '../action-creators'
import { theme } from '../selectors'
import { createId, timestamp } from '../util'
import { ActionButton } from './ActionButton'
import Modal from './Modal'
import Input from './Input'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { authenticated, user: { uid = '' } = {} } = state
  return {
    dark: theme(state) !== 'Light',
    uid,
    authenticated,
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
const ModalInvites = ({ dark, uid, authenticated }: ReturnType<typeof mapStateToProps>) => {
  const isMounted = useRef(false)
  const firstUpdate = useRef(true)
  const giftCodeType: InviteCodes[] = []
  const giftCodesRefs = useRef(giftCodeType)

  const dispatch = useDispatch()

  const [focusedGiftCode, updateFocusedGiftCode] = useState(-1)
  const [copiedGiftCode, updateCopiedGiftCode] = useState('')
  const [giftCode, updateGiftCode] = useState<GiftCodeArray[] | []>([])

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      const userDb = window.firebase.database().ref(`users/${uid}`).child('invites')
      userDb.once('value', (snapshot: Firebase.Snapshot) => {
        const inviteCodes = Object.keys(snapshot.val() || {})

        if (inviteCodes.length === 0) {
          generateUserInvites()
        } else {
          inviteCodes.forEach((inviteCode: string) => {
            const invitesDb = window.firebase.database().ref(`invites/${inviteCode}`)
            invitesDb.on('value', (snapshot: Firebase.Snapshot) => {
              giftCodesRefs.current = {
                ...giftCodesRefs.current,
                [inviteCode]: {
                  id: inviteCode,
                  ...snapshot.val(),
                },
              }
              if (Object.keys(giftCodesRefs.current).length === 3) updateGiftCodes()
            })
          })
        }
      })
    }
  }, [])

  /** Generates user invites when none exists. */
  const generateUserInvites = () => {
    giftCodesRefs.current = Array.from({ length: 3 }).map(() => {
      const inviteId = createId().slice(0, 8)
      const newInviteCode = {
        createdBy: uid,
        created: timestamp(),
        hasSeen: false,
      }
      window.firebase.database().ref(`/invites/${inviteId}`).set(newInviteCode)
      window.firebase.database().ref(`/users/${uid}/invites/${inviteId}`).set(true)

      return { ...newInviteCode, id: inviteId }
    })
    updateGiftCodes()
  }

  /** Sets user invites in state. */
  const updateGiftCodes = (id = '') => {
    const giftCodes: GiftCodeArray[] = Object.entries(giftCodesRefs.current).map(invite => ({
      link: `${window.location.origin}/signup?code=${invite[1].id}`,
      used: !!invite[1].used,
      seen: id !== '' && id === invite[1].id ? true : invite[1].hasSeen,
      id: invite[1].id,
      type: (id !== '' && id === invite[1].id) || invite[1].hasSeen ? 'text' : 'password',
    }))
    updateGiftCode(_.sortBy(giftCodes, ['id']))
  }

  /** Handle onFocus and onBlur event. */
  const changeType = (idx: number | any, id: string | any, actionType: string) => {
    if (actionType === 'focus') {
      const isVisible = giftCode.find(({ id: inviteId }) => id === inviteId)?.seen
      if (!isVisible) {
        updateGiftCodes(id)
        dispatch(updateInviteCode(uid, id, false))
      }
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
