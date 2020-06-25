/**
 */

import React from 'react'
import Modal from './Modal'

/** Shrink modal text and logos to fit container vertically. */
const onRef = (el: HTMLDivElement) => {
  if (el) {
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
    const shrinkFontSize = (el: HTMLElement) => el.style.fontSize = --fontSize + '%' // eslint-disable-line no-return-assign

    /** Decreases the width of the element. */
    const shrinkWidth = (el: HTMLElement) => el.style.width = (width -= LOGO_SCALE_PX_PER_PERCENTAGE) + 'px' // eslint-disable-line no-return-assign

    if (fontSize) {
      while (overflow() && fontSize >= MIN_FONT_SIZE) { // eslint-disable-line fp/no-loops, no-unmodified-loop-condition
        shrinkFontSize(contentEl)
        logoEls.forEach(shrinkWidth)
      }
    }
  }
}

/** A modal that welcomes the user to em. */
const ModalWelcome = () =>
  <div ref={onRef}>
    {/* @ts-ignore */}
    <Modal id='welcome' title='Welcome to em' className='popup' center>
      <p><b>em</b> is a writing tool that reflects the structure of your thoughts.</p>
    </Modal>
  </div>

export default ModalWelcome
