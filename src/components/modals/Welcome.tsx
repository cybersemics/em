/* eslint-disable no-unmodified-loop-condition */
import { useDispatch, useSelector } from 'react-redux'
import { clearActionCreator as clear } from '../../actions/clear'
import { closeModalActionCreator as closeModal } from '../../actions/closeModal'
import { tutorialActionCreator as tutorial } from '../../actions/tutorial'
import { tutorialStepActionCreator as tutorialStep } from '../../actions/tutorialStep'
import { HOME_TOKEN } from '../../constants'
import { hasChildren } from '../../selectors/getChildren'
import offlineStatusStore from '../../stores/offlineStatusStore'
import fastClick from '../../util/fastClick'
import { ActionButton } from './../ActionButton'
import ModalComponent from './ModalComponent'

/** Shrink modal text and logos to fit container vertically. */
const onRef = (el: HTMLDivElement) => {
  if (!el) return
  const BOTTOM_MARGIN = 20
  const MIN_FONT_SIZE = 10
  const LOGO_SCALE_PX_PER_PERCENTAGE = 0.3

  const contentEl = el.querySelector('.modal-content') as HTMLElement

  if (!contentEl) return

  const logoEls = el.querySelectorAll('.logo') as NodeListOf<SVGGraphicsElement & HTMLElement & { width: number }>
  let fontSize = 100
  let width = logoEls[0] && logoEls[0].width

  /** Returns true if the text overflows past the window height. */
  const overflow = () => {
    const { y, height } = contentEl.getBoundingClientRect()
    return y + height + BOTTOM_MARGIN > window.innerHeight
  }

  /** Decreases the font size of the element. */
  const shrinkFontSize = (el: HTMLElement) => (el.style.fontSize = --fontSize + '%') // eslint-disable-line no-return-assign

  /** Decreases the width of the element. */
  const shrinkWidth = (el: HTMLElement) => (el.style.width = (width -= LOGO_SCALE_PX_PER_PERCENTAGE) + 'px') // eslint-disable-line no-return-assign

  if (fontSize) {
    while (overflow() && fontSize >= MIN_FONT_SIZE) {
      shrinkFontSize(contentEl)
      logoEls.forEach(shrinkWidth)
    }
  }
}

/** A modal that welcomes the user to em. */
const ModalWelcome = () => {
  const dispatch = useDispatch()
  const isEmpty = useSelector(state => !hasChildren(state, HOME_TOKEN))

  /** Close the welcome modal. */
  const close = () => dispatch(closeModal())

  /** End the tutorial. */
  const endTutorial = () => {
    // If the websocket is still connecting for the first time when the tutorial is dismissed, change the status to reconnecting (which occurs in the background) to dismiss "Connecting..." and render the available thoughts. See: EmptyThoughtspace.tsx.
    offlineStatusStore.update(statusOld =>
      statusOld === 'preconnecting' || statusOld === 'connecting' ? 'reconnecting' : statusOld,
    )

    dispatch(
      tutorial({
        value: false,
      }),
    )
  }

  return (
    <div ref={onRef}>
      <ModalComponent
        id='welcome'
        title='Welcome to em'
        className='popup'
        hideModalActions={false}
        hideClose={true}
        center
        // the modal is closed by ModalComponent when Escape is hit, so make sure to end the tutorial
        onClose={endTutorial}
        actions={() => (
          <div>
            <div>
              <ActionButton key='start' title={`${isEmpty ? 'START' : 'RESUME'} TUTORIAL`} {...fastClick(close)} />
            </div>
            {!isEmpty && (
              <div style={{ margin: '1em 0' }}>
                <ActionButton
                  key='resume'
                  title='RESTART TUTORIAL'
                  inverse
                  {...fastClick(() => {
                    dispatch([tutorial({ value: true }), tutorialStep({ value: 1 }), closeModal()])
                  })}
                />
              </div>
            )}
            <div key='skip' style={{ marginTop: 15, opacity: 0.5 }}>
              <a
                id='skip-tutorial'
                className='text-small'
                {...fastClick(() => {
                  dispatch([clear({ local: true, remote: true })])
                  endTutorial()
                  close()
                })}
                style={{
                  marginBottom: '-1em',
                  paddingBottom: '1em',
                  textDecoration: 'none',
                }}
              >
                New, empty thoughtspace
              </a>
            </div>
          </div>
        )}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ maxWidth: 560 }}>
            <p>
              <b>em</b> is a process-oriented writing tool for personal sensemaking.
            </p>
          </div>
        </div>
      </ModalComponent>
    </div>
  )
}

export default ModalWelcome
