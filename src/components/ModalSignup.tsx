import React, { useCallback, useEffect, useState, ChangeEventHandler } from 'react'
import { useDispatch } from 'react-redux'
import { ActionButton } from './ActionButton'
import { Index, InviteCode } from '../@types'
import { showModal } from '../action-creators'
import Modal from './Modal'
import { getInviteById, updateInviteCode } from '../apis/invites'
import { getQueryParam, timestamp, storage } from '../util'
import InvitesIcon from './icons/InvitesIcon'

interface Mode {
  name: string
  modalKey: string
  modalTitle: string
}

const modes: Index<Mode> = {
  signup: {
    name: 'signup',
    modalKey: 'signup',
    modalTitle: 'Sign Up',
  },
}

// TODO: Separate this into separate file to reuse.
const firebaseErrorsIndex = {
  'auth/weak-password': 'Password should be at least 6 characters',
  'auth/email-already-in-use': 'Account already exists',
  'auth/invalid-email': 'Invalid email',
  'auth/wrong-password': 'Invalid username or password',
  'auth/user-not-found': 'User not found',
  'auth/too-many-requests': 'Account temporarily disabled. You can restore it by resetting your password',
  default: 'Something went wrong',
}

type errorCode = keyof typeof firebaseErrorsIndex

/** A modal dialog for signing up. */
const ModalSignup = () => {
  const dispatch = useDispatch()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null)

  const [isValidatingCode, setIsValidatingCode] = useState(true)
  const [validationError, setValidationError] = useState<null | string>(null)

  const [isSubmitting, updateIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<null | string>(null)

  /**
   * Gets the invitation code from url and the validates it.
   */
  const handleInvitationCode = useCallback(async () => {
    const invitationCodeId = getQueryParam('code')

    // TODO: Send user back to another screen if user has no valid code.
    if (!invitationCodeId) {
      setValidationError('Invitation code not found')
      setIsValidatingCode(false)
      return
    }

    // TODO: May be use never throw style error handling
    try {
      const inviteCode = await getInviteById(invitationCodeId)

      if (inviteCode.used) {
        setValidationError('Invitation code has already been used.')
        setIsValidatingCode(false)
        return
      }

      // Set the invite code and is validating to false, only if code is valid.
      setInviteCode(inviteCode)
      setIsValidatingCode(false)
    } catch (err) {
      setValidationError(err.message)
      setIsValidatingCode(false)
    }
  }, [])

  useEffect(() => {
    handleInvitationCode()
  }, [])

  /** Sign up with email and password. */
  const submitAction = useCallback(
    async (closeModal: () => void) => {
      updateIsSubmitting(true)
      try {
        await window.firebase.auth().createUserWithEmailAndPassword(formData.email, formData.password!)

        const user = window.firebase.auth().currentUser

        const updatedInviteCode: InviteCode = {
          ...inviteCode!,
          hasSeen: true,
          used: timestamp(),
          usedBy: user.uid,
        }

        await updateInviteCode(updatedInviteCode)

        closeModal()
        updateIsSubmitting(false)
        storage.setItem('modal-to-show', 'welcome')

        // TODO: May be use react router ?
        window.history.pushState({}, '', window.location.origin)
        setTimeout(() => window.location.reload(), 300)
      } catch (error) {
        updateIsSubmitting(false)
        return setSubmitError(firebaseErrorsIndex[error?.code as errorCode] || firebaseErrorsIndex.default)
      }
    },
    [formData],
  )

  /**
   * Handles form change.
   */
  const formChangeHandler: ChangeEventHandler<HTMLInputElement> = e =>
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })

  return (
    <Modal
      id='signup'
      title={modes.signup.modalTitle}
      className='popup'
      center
      preventCloseOnEscape={true}
      actions={({ close: closeModal }) => (
        <div>
          {!isValidatingCode && (
            <>
              {/* Only show sign up button if invitation is valid. */}
              {!validationError && inviteCode && (
                <ActionButton
                  key={modes.signup.modalKey}
                  title={modes.signup.modalTitle}
                  active={true}
                  isDisabled={isSubmitting}
                  isLoading={isSubmitting}
                  onClick={() => submitAction(closeModal)}
                />
              )}
              <button
                disabled={isSubmitting}
                className='button'
                onClick={() => dispatch(showModal({ id: 'auth' }))}
                style={{ textDecoration: 'underline', marginTop: 15 }}
              >
                Log in
              </button>
            </>
          )}
        </div>
      )}
    >
      {/* Show validation in progress */}
      {isValidatingCode && <div style={{ fontSize: '18px' }}>Validating...</div>}
      {/* Show validation or submit error. */}
      {(validationError || submitError) && (
        <div style={{ display: 'flex', minHeight: '100px', flexDirection: 'column' }}>
          <span style={{ color: 'crimson', paddingBottom: '30px', fontSize: '18px' }}>
            {validationError || submitError}
          </span>
        </div>
      )}
      {/* Show sign up form only if invitation code is valid. */}
      {!isValidatingCode && !validationError && inviteCode && (
        <>
          <div
            style={{
              fontSize: '18px',
              marginBottom: '60px',
            }}
          >
            You have have been gifted an invitation to <b>em</b>!{' '}
            <InvitesIcon style={{ marginLeft: 5, verticalAlign: 'middle' }} />
          </div>
          <form style={{ display: 'flex', minHeight: '100px', flexDirection: 'column' }}>
            <input name='email' type='email' placeholder='email' value={formData.email} onChange={formChangeHandler} />
            <input
              name='password'
              type='password'
              placeholder='password'
              value={formData.password}
              onChange={formChangeHandler}
            />
          </form>
        </>
      )}
    </Modal>
  )
}

export default ModalSignup
