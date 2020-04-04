import React from 'react'

// components
import Modal from './Modal.js'

const onRef = el => {
  // shrink text and logos to fit container vertically
  if (el) {
    const BOTTOM_MARGIN = 20
    const MIN_FONT_SIZE = 10
    const LOGO_SCALE_PX_PER_PERCENTAGE = 0.3

    const contentEl = el.querySelector('.modal-content')

    if (!contentEl) return

    const logoEls = el.querySelectorAll('.logo')
    let fontSize = 100 // eslint-disable-line fp/no-let
    let width = logoEls[0] && logoEls[0].width // eslint-disable-line fp/no-let

    /** Returns true if the text overflows past the window height. */
    const overflow = () => {
      const { y, height } = contentEl.getBoundingClientRect()
      return y + height + BOTTOM_MARGIN > window.innerHeight
    }

    const shrinkFontSize = el => el.style.fontSize = --fontSize + '%' // eslint-disable-line no-return-assign
    const shrinkWidth = el => el.style.width = (width -= LOGO_SCALE_PX_PER_PERCENTAGE) + 'px' // eslint-disable-line no-return-assign

    if (fontSize) {
      while (overflow() >= MIN_FONT_SIZE) { // eslint-disable-line fp/no-loops
        shrinkFontSize(contentEl)
        logoEls.forEach(shrinkWidth)
      }
    }
  }
}

const ModalWelcome = () =>
  <div ref={onRef}>
    <Modal id='welcome' title='Welcome to em' className='popup' center>
      <p><b>em</b> is a writing tool that reflects the structure of your thoughts.</p>
    </Modal>
  </div>

export default ModalWelcome
