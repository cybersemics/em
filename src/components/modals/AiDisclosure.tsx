import { FC } from 'react'
import { useDispatch } from 'react-redux'
import { css } from '../../../styled-system/css'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { acceptAiDisclosure, cancelAiDisclosure, hasPendingAiUse } from '../../util/aiDisclosure'
import fastClick from '../../util/fastClick'
import ActionButton from '../ActionButton'
import ModalComponent from './ModalComponent'

/** A blocking disclosure before sending thought context to AI services. */
const AiDisclosure: FC = () => {
  const pendingAiUse = hasPendingAiUse()
  const dispatch = useDispatch()

  /** Returns to Settings when the disclosure was opened from its acknowledgement checkbox. */
  const returnToSettings = () => {
    dispatch(showModal({ id: 'settings' }))
  }

  return (
    <ModalComponent
      id='aiDisclosure'
      title='AI Data Acknowledgment'
      onClose={cancelAiDisclosure}
      onClosed={pendingAiUse ? undefined : returnToSettings}
      actions={({ close }) => (
        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '1em', justifyContent: 'center' })}>
          <ActionButton
            key='cancel-ai-disclosure'
            title='Cancel'
            inverse
            {...fastClick(() => {
              if (pendingAiUse) {
                close()
              } else {
                cancelAiDisclosure()
                returnToSettings()
              }
            })}
          />
          {pendingAiUse && (
            <ActionButton
              key='allow-ai-once'
              title='Allow once'
              {...fastClick(() => {
                const continuation = acceptAiDisclosure({ remember: false })
                close()
                continuation?.()
              })}
            />
          )}
          <ActionButton
            key='allow-ai-and-remember'
            title='Always allow'
            {...fastClick(() => {
              const continuation = acceptAiDisclosure({ remember: true })
              if (pendingAiUse) {
                close()
                continuation?.()
              } else {
                returnToSettings()
              }
            })}
          />
        </div>
      )}
    >
      <p>
        Functionality that uses AI (such as the 'Generate Thought' command) can send relevant data to the OpenAI
        service.
      </p>
      <p>
        This data may include content such as the current thought, related siblings, and ancestor context. It is
        recommended to not use this feature with sensitive information.
      </p>
      {pendingAiUse ? (
        <p>
          Choose 'Cancel' to cancel the current action and not opt in to AI functionality at this time. Choose 'Allow
          once' to permit the current action and ask again later. Choose 'Always allow' to opt in to AI functionality
          and remember your choice.
        </p>
      ) : (
        <p>
          Choose 'Cancel' to leave AI functionality disabled. Choose 'Always allow' to opt in to AI functionality and
          remember your choice.
        </p>
      )}
      <p>
        For more information, see the{' '}
        <a target='_blank' rel='noopener noreferrer' href='https://openai.com/policies/row-privacy-policy/'>
          OpenAI Privacy Policy
        </a>
        .
      </p>
    </ModalComponent>
  )
}

export default AiDisclosure
