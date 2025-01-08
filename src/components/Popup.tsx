import React from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import PopupBase, { PopupBaseProps } from './PopupBase'

/** A dismissable popup at the top of the screen, built upon PopupBase. */
const Popup = React.forwardRef<
  HTMLDivElement,
  {
    textAlign?: 'center' | 'left' | 'right'
    value?: string | null
  } & Omit<PopupBaseProps, 'className'>
>(({ children, textAlign = 'center', ...props }, ref) => {
  const padding = useSelector(state => state.fontSize / 2 + 2)

  return (
    <div
      className={css({
        zIndex: 'commandPalette',
        width: '100%',
        height: '100%',
        color: 'gray50',
        backgroundColor: 'gray',
      })}
    >
      <PopupBase
        ref={ref}
        fullScreen
        // scale with font size to stay vertically centered over toolbar
        padding={`${padding}px 0 ${padding}px`}
        textAlign={textAlign}
        {...props}
      >
        <div data-testid='popup-value' className={css({ padding: '0.25em', backgroundColor: 'bgOverlay80' })}>
          {children}
        </div>
      </PopupBase>
    </div>
  )
})

Popup.displayName = 'Popup'

export default Popup
