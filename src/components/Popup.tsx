import React from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import PopupBase, { PopupBaseProps } from './PopupBase'

/** A popup component that can be dismissed. */
const Popup = React.forwardRef<
  HTMLDivElement,
  {
    textAlign?: 'center' | 'left' | 'right'
    value?: string | null
    cssRaw?: SystemStyleObject
  } & Omit<PopupBaseProps, 'className'>
>(({ children, textAlign = 'center', cssRaw, style, ...props }, ref) => {
  const padding = useSelector(state => state.fontSize / 2 + 2)

  return (
    <PopupBase
      ref={ref}
      cssRaw={css.raw(
        {
          boxShadow: 'none',
          border: 'none',
          display: 'block',
          padding: '8%',
          boxSizing: 'border-box',
          zIndex: 'popup',
          backgroundColor: 'bg',
          width: '100%',
          color: 'gray50',
          overflowY: 'auto',
          maxHeight: '100%',
          maxWidth: '100%',
        },
        cssRaw,
      )}
      style={{
        // scale with font size to stay vertically centered over toolbar
        padding: `${padding}px 0 ${padding}px`,
        textAlign,
        ...style,
      }}
      {...props}
    >
      <div data-testid='popup-value' className={css({ padding: '0.25em', backgroundColor: 'bgOverlay80' })}>
        {children}
      </div>
    </PopupBase>
  )
})

Popup.displayName = 'Popup'

export default Popup
