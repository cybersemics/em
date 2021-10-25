import React, { useState, useEffect, useCallback } from 'react'
import { connect, useDispatch } from 'react-redux'
import { InviteCode, State, Firebase, Index } from '../@types'
import InvitesIcon from './icons/InvitesIcon'
import CheckmarkIcon from './icons/CheckmarkIcon'
import CopyClipboard from './icons/CopyClipboard'
import { alert } from '../action-creators'
import { theme } from '../selectors'
import { createId, timestamp } from '../util'
import { ActionButton } from './ActionButton'
import Modal from './Modal'
import { getInviteById, updateInviteCode } from '../apis/invites'
import _ from 'lodash'
import { baseUrl } from '../device/router'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { authenticated, user: { uid = '' } = {} } = state
  return {
    dark: theme(state) !== 'Light',
    uid,
    authenticated,
  }
}

/**
 * Get all the invite codes that belongs to the given user.
 */
const getUserInviteCodes = (userId: string) => {
  const userDb = window.firebase.database().ref(`users/${userId}`).child('invites')
  return new Promise<string[]>((resolve, reject) => {
    userDb.once('value', (snapshot: Firebase.Snapshot) => {
      resolve(Object.keys(snapshot.val() || {}))
    })
  })
}

/** Generates three user invites. */
const generateUserInvites = (userId: string) =>
  Promise.all(
    Array.from({ length: 3 }).map<Promise<InviteCode>>(async () => {
      const inviteId = createId().slice(0, 8)

      const newInviteCode: Omit<InviteCode, 'id'> = {
        createdBy: userId,
        created: timestamp(),
        hasSeen: false,
      }

      await Promise.all([
        window.firebase.database().ref(`/invites/${inviteId}`).set(newInviteCode),
        window.firebase.database().ref(`/users/${userId}/invites/${inviteId}`).set(true),
      ])

      return { ...newInviteCode, id: inviteId }
    }),
  )

/** Modal to get gift codes. */
const ModalInvites = ({ dark, uid, authenticated }: ReturnType<typeof mapStateToProps>) => {
  const dispatch = useDispatch()

  const [focusedGiftCode, setFocusedGiftCode] = useState<string | null>(null)
  const [inviteCodes, setInviteCodes] = useState<Index<InviteCode>>({})

  const [isFetchingInvites, setIsFetchingInvites] = useState(true)

  /**
   * Gets all invite codes of a user if available or generate them.
   */
  const getAllInvitesOrGenerate = useCallback(async (userId: string) => {
    const inviteCodeIds = await getUserInviteCodes(userId)

    const shouldGenerateInvites = inviteCodeIds.length === 0

    const inviteCodes = await (shouldGenerateInvites
      ? generateUserInvites(userId)
      : Promise.all(inviteCodeIds.map(giftCode => getInviteById(giftCode))))

    if (!inviteCodes) {
      console.error('Invite codes not found!')
      setIsFetchingInvites(false)
      return
    }

    setInviteCodes(_.keyBy(inviteCodes, ({ id }) => id))
    setIsFetchingInvites(false)
  }, [])

  useEffect(() => {
    getAllInvitesOrGenerate(uid)
  }, [])

  /**
   * Handle when a invite code is seen by user.
   */
  const onInviteCodeSeen = async (inviteCodeId: string) => {
    const inviteCode = inviteCodes[inviteCodeId]

    if (!inviteCode) {
      console.error(`InviteCode with id ${inviteCodeId} not found`)
      return
    }

    if (!inviteCode?.hasSeen) {
      const updatedInviteCode = {
        ...inviteCode,
        hasSeen: true,
      }

      const updatedInviteCodes: Index<InviteCode> = {
        ...inviteCodes,
        [inviteCodeId]: updatedInviteCode,
      }

      setInviteCodes(updatedInviteCodes)
      setFocusedGiftCode(inviteCode.id)

      await updateInviteCode(updatedInviteCode)
    }
  }

  /** Copy text to clipboard. */
  const updateCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    dispatch(alert('Invite code copied to clipboard', { clearDelay: 2000 }))
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
          You get three shiny gift codes to share <b>em</b> with anyone you choose!
        </p>
        {isFetchingInvites && <p style={{ fontSize: '18px' }}>Fetching your shiny codes ✨...</p>}
        {Object.values(inviteCodes).map(({ used, id, hasSeen }, idx) => {
          const selectedIconFill = focusedGiftCode !== id ? 'grey' : undefined
          const link = `${baseUrl}/signup?code=${id}`
          return (
            <div key={`${id}-gift-code`} className='gift-code-wrapper'>
              <div
                style={{ display: 'inline-flex' }}
                onClick={() => (focusedGiftCode === id ? setFocusedGiftCode(null) : onInviteCodeSeen(id))}
              >
                <InvitesIcon fill={selectedIconFill} size={26} />
              </div>
              <input
                type={hasSeen ? 'text' : 'password'}
                placeholder='gift-code'
                value={link}
                onBlur={() => setFocusedGiftCode(null)}
                onFocus={() => onInviteCodeSeen(id)}
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
