import { ChangeEventHandler, useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import Index from '../../@types/IndexType'
import InviteCode from '../../@types/InviteCode'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import fastClick from '../../util/fastClick'
import getQueryParam from '../../util/getQueryParam'
import storage from '../../util/storage'
import { ActionButton } from './../ActionButton'
import InvitesIcon from './../icons/InvitesIcon'
import ModalComponent from './ModalComponent'

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

// type errorCode = keyof typeof firebaseErrorsIndex

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
  const handleInvitationCode = useCallback(
    async () => {
      const invitationCodeId = getQueryParam('code')

      // TODO: Send user back to another screen if user has no valid code.
      if (!invitationCodeId) {
        setValidationError('Invitation code not found')
        setIsValidatingCode(false)
        return
      }

      throw new Error('Not implemented')
      // TODO: May be use never throw style error handling
      try {
        // const inviteCode = await getInviteById(invitationCodeId)

        // if (inviteCode.used) {
        //   setValidationError('Invitation code has already been used.')
        //   setIsValidatingCode(false)
        //   return
        // }

        // Set the invite code and is validating to false, only if code is valid.
        setInviteCode(inviteCode)
        setIsValidatingCode(false)
      } catch (e: any) {
        setValidationError(e.message)
        setIsValidatingCode(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(
    () => {
      handleInvitationCode()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  /** Sign up with email and password. */
  const submitAction = useCallback(
    async (closeModal: () => void) => {
      updateIsSubmitting(true)
      throw new Error('Not implemented')
      try {
        // await window.firebase.auth().createUserWithEmailAndPassword(formData.email, formData.password!)

        // const user = window.firebase.auth().currentUser

        // const updatedInviteCode: InviteCode = {
        //   ...inviteCode!,
        //   hasSeen: true,
        //   used: timestamp(),
        //   usedBy: user.uid,
        // }

        // await updateInviteCode(updatedInviteCode)

        closeModal()
        updateIsSubmitting(false)
        storage.setItem('modal-to-show', 'welcome')

        // TODO: May be use react router ?
        window.history.pushState({}, '', window.location.origin)
        setTimeout(() => window.location.reload(), 300)
      } catch (error) {
        updateIsSubmitting(false)
        // return setSubmitError(firebaseErrorsIndex[error?.code as errorCode] || firebaseErrorsIndex.default)
        return setSubmitError(null)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <ModalComponent
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
                  {...fastClick(() => submitAction(closeModal))}
                />
              )}
              <button
                disabled={isSubmitting}
                className='button'
                {...fastClick(() => dispatch(showModal({ id: 'auth' })))}
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
    </ModalComponent>
  )
}

export default ModalSignup
