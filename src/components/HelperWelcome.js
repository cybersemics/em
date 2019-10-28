import React from 'react'

// components
import { Helper } from './Helper.js'

export const HelperWelcome = () =>
  <div ref={el => {
    // shrink text and logos to fit container vertically
    if (el) {
      const BOTTOM_MARGIN = 20
      const MIN_FONT_SIZE = 10
      const LOGO_SCALE_PX_PER_PERCENTAGE = 0.3

      const contentEl = el.querySelector('.helper-content')

      if (!contentEl) return

      const logoEls = el.querySelectorAll('.logo')
      let fontSize = 100
      let width = logoEls[0] && logoEls[0].width

      /** Returns true if the text overflows past the window height. */
      const overflow = () => {
        const { y, height } = contentEl.getBoundingClientRect()
        return y + height + BOTTOM_MARGIN > window.innerHeight
      }

      const shrinkFontSize = el => el.style.fontSize = --fontSize + '%'
      const shrinkWidth = el => el.style.width = (width -= LOGO_SCALE_PX_PER_PERCENTAGE) + 'px'

      while(overflow() && fontSize >= MIN_FONT_SIZE) {
        shrinkFontSize(contentEl)
        logoEls.forEach(shrinkWidth)
      }
    }
  }}>
    <Helper id='welcome' title='Welcome to em' className='popup' center>
      <p><b>em</b> is a tool that helps you become more aware of your own thinking process.</p>
      <p>The features of <b>em</b> mirror the features of your mind—from focus, to multiple contexts, to the interconnectedness of ideas.</p>
    </Helper>
  </div>

