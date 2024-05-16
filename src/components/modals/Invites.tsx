import _ from 'lodash'
import { nanoid } from 'nanoid'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Index from '../../@types/IndexType'
import InviteCode from '../../@types/InviteCode'
import { alertActionCreator as alert } from '../../actions/alert'
import { baseUrl } from '../../device/router'
import themeColors from '../../selectors/themeColors'
import fastClick from '../../util/fastClick'
import timestamp from '../../util/timestamp'
import { ActionButton } from './../ActionButton'
import CheckmarkIcon from './../icons/CheckmarkIcon'
import CopyClipboard from './../icons/CopyClipboard'
import InvitesIcon from './../icons/InvitesIcon'
import ModalComponent from './ModalComponent'

/**
 * Get all the invite codes that belongs to the given user.
 */
const getUserInviteCodes = (userId: string): Promise<string[]> => {
  throw new Error('Not implemented')
  // return new Promise<string[]>((resolve, reject) => {
  //   userDb.once('value', (snapshot: Firebase.Snapshot) => {
  //     resolve(Object.keys(snapshot.val() || {}))
  //   })
  // })
}

/** Generates three user invites. */
const generateUserInvites = (userId: string) =>
  Promise.all(
    Array.from({ length: 3 }).map<Promise<InviteCode>>(async () => {
      const inviteId = nanoid(8)

      const newInviteCode: Omit<InviteCode, 'id'> = {
        createdBy: userId,
        created: timestamp(),
        hasSeen: false,
      }

      throw new Error('Not implemented')
      // await Promise.all([
      //   window.firebase.database().ref(`/invites/${inviteId}`).set(newInviteCode),
      //   window.firebase.database().ref(`/users/${userId}/invites/${inviteId}`).set(true),
      // ])

      return { ...newInviteCode, id: inviteId }
    }),
  )

/** Modal to get gift codes. */
const Invites = () => {
  const dispatch = useDispatch()

  const colors = useSelector(themeColors)
  const [focusedGiftCode, setFocusedGiftCode] = useState<string | null>(null)
  const [inviteCodes, setInviteCodes] = useState<Index<InviteCode>>({})

  const [isFetchingInvites, setIsFetchingInvites] = useState(true)

  /**
   * Gets all invite codes of a user if available or generate them.
   */
  const getAllInvitesOrGenerate = useCallback(async (userId: string) => {
    const inviteCodeIds = await getUserInviteCodes(userId)

    const shouldGenerateInvites = inviteCodeIds.length === 0

    throw new Error('Not implemented')
    const inviteCodes = shouldGenerateInvites
      ? await generateUserInvites(userId)
      : // : Promise.all(inviteCodeIds.map(giftCode => getInviteById(giftCode))))
        []

    if (!inviteCodes) {
      console.error('Invite codes not found!')
      setIsFetchingInvites(false)
      return
    }

    setInviteCodes(_.keyBy(inviteCodes, ({ id }) => id))
    setIsFetchingInvites(false)
  }, [])

  useEffect(() => {
    // getAllInvitesOrGenerate(uid)
    getAllInvitesOrGenerate('')
  }, [getAllInvitesOrGenerate])

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

      throw new Error('Not implemented')
      // await updateInviteCode(updatedInviteCode)
    }
  }

  /** Copy text to clipboard. */
  const updateCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    dispatch(alert('Invite code copied to clipboard', { clearDelay: 2000 }))
  }

  throw new Error('Not implemented')
  // if (!authenticated) {
  //   return <div>You arent allowed to view this page. </div>
  // }

  return (
    <ModalComponent
      id='invites'
      title='Gift codes'
      className='popup'
      center
      actions={({ close }) => (
        <div>
          <ActionButton key='close' title='Close' {...fastClick(() => close())} />
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
                {...fastClick(() => (focusedGiftCode === id ? setFocusedGiftCode(null) : onInviteCodeSeen(id)))}
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
                <CheckmarkIcon fill={colors.bg} size={21} />
              )}
              <div className='copy-icon-wrapper' {...fastClick(() => updateCopy(link))}>
                <CopyClipboard fill={selectedIconFill} size={26} />
              </div>
            </div>
          )
        })}
      </div>
    </ModalComponent>
  )
}

export default Invites
