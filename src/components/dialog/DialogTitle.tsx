import React, { PropsWithChildren } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import ArrowLeftIcon from '../icons/ArrowLeftIcon'
import ArrowRightIcon from '../icons/ArrowRightIcon'
import InfoGenieIcon from '../icons/InfoGenieIcon'
import XIcon from '../icons/XIcon'
import CircleButton from './CircleButton'

interface DialogTitleProps {
  onClose: () => void
}

/**
 * Dialog title row. Three parts: left button cluster (Back/Forward), centered title,
 * right button cluster (Help/Close). The flex:1 cluster wrappers balance the row so
 * the title stays optically centered.
 *
 * Back / Forward / Help are visual-only per the spec — they don't dispatch yet.
 */
const DialogTitle: React.FC<PropsWithChildren<DialogTitleProps>> = ({ children, onClose }) => {
  const dialog = dialogRecipe()
  const iconFill = token('colors.dialogHeaderButtonIcon')
  return (
    <div className={dialog.titleContainer}>
      <div className={dialog.headerSide}>
        <CircleButton ariaLabel='Back'>
          <ArrowLeftIcon size={24} fill={iconFill} />
        </CircleButton>
        <CircleButton ariaLabel='Forward'>
          <ArrowRightIcon size={24} fill={iconFill} />
        </CircleButton>
      </div>
      <h2 className={dialog.titleText}>{children}</h2>
      <div className={dialog.headerSide}>
        <CircleButton ariaLabel='Help'>
          <InfoGenieIcon size={24} fill={iconFill} />
        </CircleButton>
        <CircleButton ariaLabel='Close' onClick={onClose}>
          <XIcon size={24} fill={iconFill} />
        </CircleButton>
      </div>
    </div>
  )
}

export default DialogTitle
