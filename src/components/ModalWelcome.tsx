/* eslint-disable no-unmodified-loop-condition */
import React from 'react'
import { useDispatch } from 'react-redux'
import tutorial from '../action-creators/tutorial'
import { ActionButton } from './ActionButton'
import Modal from './Modal'

/** Shrink modal text and logos to fit container vertically. */
const onRef = (el: HTMLDivElement) => {
  if (!el) return
  const BOTTOM_MARGIN = 20
  const MIN_FONT_SIZE = 10
  const LOGO_SCALE_PX_PER_PERCENTAGE = 0.3

  const contentEl = el.querySelector('.modal-content') as HTMLElement

  if (!contentEl) return

  const logoEls = el.querySelectorAll('.logo') as NodeListOf<SVGGraphicsElement & HTMLElement & { width: number }>
  let fontSize = 100 // eslint-disable-line fp/no-let
  let width = logoEls[0] && logoEls[0].width // eslint-disable-line fp/no-let

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
    // eslint-disable-next-line fp/no-loops
    while (overflow() && fontSize >= MIN_FONT_SIZE) {
      // eslint-disable-line fp/no-loops, no-unmodified-loop-condition
      shrinkFontSize(contentEl)
      logoEls.forEach(shrinkWidth)
    }
  }
}

/** A modal that welcomes the user to em. */
const ModalWelcome = () => {
  const dispatch = useDispatch()

  /** End the tutorial. */
  const endTutorial = () => {
    dispatch(
      tutorial({
        value: false,
      }),
    )
  }

  return (
    <div ref={onRef}>
      <Modal
        id='welcome'
        title='Welcome to em'
        className='popup'
        hideModalActions={false}
        hideClose={true}
        center
        // the modal is closed by ModalComponent when Escape is hit, so make sure to end the tutorial
        onClose={endTutorial}
        actions={({ complete }) => (
          <div>
            <ActionButton key='start' title='START TUTORIAL' onClick={complete} />
            {
              <div key='skip' style={{ marginTop: 10, opacity: 0.5 }}>
                <a
                  id='skip-tutorial'
                  onClick={() => {
                    endTutorial()
                    complete()
                  }}
                >
                  This ain’t my first rodeo. Skip it.
                </a>
              </div>
            }
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
      </Modal>
    </div>
  )
}

export default ModalWelcome
